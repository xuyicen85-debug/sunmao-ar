from pathlib import Path
import struct
import zlib


ROOT = Path(__file__).resolve().parent
LINK_FILE = ROOT / "share-link.txt"
OUT_FILE = ROOT / "qrcode.png"

VERSION = 5
SIZE = 17 + VERSION * 4
DATA_CODEWORDS = 108
ECC_CODEWORDS = 26
SCALE = 12
BORDER = 4
DARK = (61, 43, 31)
LIGHT = (255, 250, 240)


def gf_tables():
    exp = [0] * 512
    log = [0] * 256
    x = 1
    for i in range(255):
        exp[i] = x
        log[x] = i
        x <<= 1
        if x & 0x100:
            x ^= 0x11D
    for i in range(255, 512):
        exp[i] = exp[i - 255]
    return exp, log


GF_EXP, GF_LOG = gf_tables()


def gf_mul(a, b):
    if a == 0 or b == 0:
        return 0
    return GF_EXP[GF_LOG[a] + GF_LOG[b]]


def rs_generator(degree):
    poly = [1]
    for i in range(degree):
        nxt = [0] * (len(poly) + 1)
        for j, value in enumerate(poly):
            nxt[j] ^= value
            nxt[j + 1] ^= gf_mul(value, GF_EXP[i])
        poly = nxt
    return poly


def rs_ecc(data, degree):
    gen = rs_generator(degree)
    rem = [0] * degree
    for byte in data:
        factor = byte ^ rem[0]
        rem = rem[1:] + [0]
        for i in range(degree):
            rem[i] ^= gf_mul(gen[i + 1], factor)
    return rem


def append_bits(bits, value, length):
    for i in range(length - 1, -1, -1):
        bits.append((value >> i) & 1)


def make_codewords(text):
    payload = text.encode("utf-8")
    if len(payload) > 100:
        raise ValueError("share-link.txt 里的网址太长，请缩短后重新生成二维码。")

    bits = []
    append_bits(bits, 0b0100, 4)
    append_bits(bits, len(payload), 8)
    for byte in payload:
        append_bits(bits, byte, 8)
    append_bits(bits, 0, min(4, DATA_CODEWORDS * 8 - len(bits)))
    while len(bits) % 8:
        bits.append(0)

    data = []
    for i in range(0, len(bits), 8):
        value = 0
        for bit in bits[i:i + 8]:
            value = (value << 1) | bit
        data.append(value)

    pad = [0xEC, 0x11]
    index = 0
    while len(data) < DATA_CODEWORDS:
        data.append(pad[index % 2])
        index += 1
    return data + rs_ecc(data, ECC_CODEWORDS)


def new_matrix():
    return [[None for _ in range(SIZE)] for _ in range(SIZE)], [[False for _ in range(SIZE)] for _ in range(SIZE)]


def set_module(matrix, reserved, x, y, value, is_reserved=True):
    if 0 <= x < SIZE and 0 <= y < SIZE:
        matrix[y][x] = bool(value)
        if is_reserved:
            reserved[y][x] = True


def draw_finder(matrix, reserved, x, y):
    for dy in range(-1, 8):
        for dx in range(-1, 8):
            xx, yy = x + dx, y + dy
            if 0 <= xx < SIZE and 0 <= yy < SIZE:
                dark = 0 <= dx <= 6 and 0 <= dy <= 6 and (
                    dx in (0, 6) or dy in (0, 6) or (2 <= dx <= 4 and 2 <= dy <= 4)
                )
                set_module(matrix, reserved, xx, yy, dark)


def draw_alignment(matrix, reserved, cx, cy):
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            dark = max(abs(dx), abs(dy)) in (0, 2)
            set_module(matrix, reserved, cx + dx, cy + dy, dark)


def draw_patterns(matrix, reserved):
    draw_finder(matrix, reserved, 0, 0)
    draw_finder(matrix, reserved, SIZE - 7, 0)
    draw_finder(matrix, reserved, 0, SIZE - 7)
    draw_alignment(matrix, reserved, 30, 30)

    for i in range(8, SIZE - 8):
        set_module(matrix, reserved, i, 6, i % 2 == 0)
        set_module(matrix, reserved, 6, i, i % 2 == 0)

    for i in range(9):
        if i != 6:
            set_module(matrix, reserved, 8, i, False)
            set_module(matrix, reserved, i, 8, False)
    for i in range(8):
        set_module(matrix, reserved, SIZE - 1 - i, 8, False)
    for i in range(7):
        set_module(matrix, reserved, 8, SIZE - 1 - i, False)
    set_module(matrix, reserved, 8, 4 * VERSION + 9, True)


def place_data(matrix, reserved, codewords):
    bits = []
    for byte in codewords:
        append_bits(bits, byte, 8)

    bit_index = 0
    direction = -1
    x = SIZE - 1
    while x > 0:
        if x == 6:
            x -= 1
        y = SIZE - 1 if direction == -1 else 0
        while 0 <= y < SIZE:
            for dx in (0, 1):
                xx = x - dx
                if not reserved[y][xx]:
                    bit = bits[bit_index] if bit_index < len(bits) else 0
                    if (xx + y) % 2 == 0:
                        bit ^= 1
                    set_module(matrix, reserved, xx, y, bit, False)
                    bit_index += 1
            y += direction
        direction *= -1
        x -= 2


def format_bits():
    data = (0b01 << 3) | 0
    rem = data << 10
    generator = 0x537
    for i in range(14, 9, -1):
        if (rem >> i) & 1:
            rem ^= generator << (i - 10)
    return ((data << 10) | rem) ^ 0x5412


def get_bit(value, index):
    return (value >> index) & 1


def draw_format(matrix, reserved):
    bits = format_bits()
    for i in range(6):
        set_module(matrix, reserved, 8, i, get_bit(bits, i))
    set_module(matrix, reserved, 8, 7, get_bit(bits, 6))
    set_module(matrix, reserved, 8, 8, get_bit(bits, 7))
    set_module(matrix, reserved, 7, 8, get_bit(bits, 8))
    for i in range(9, 15):
        set_module(matrix, reserved, 14 - i, 8, get_bit(bits, i))
    for i in range(8):
        set_module(matrix, reserved, SIZE - 1 - i, 8, get_bit(bits, i))
    for i in range(8, 15):
        set_module(matrix, reserved, 8, SIZE - 15 + i, get_bit(bits, i))


def png_chunk(kind, data):
    body = kind + data
    return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)


def write_png(matrix):
    pixel_size = (SIZE + BORDER * 2) * SCALE
    rows = []
    for y in range(pixel_size):
        module_y = y // SCALE - BORDER
        row = bytearray([0])
        for x in range(pixel_size):
            module_x = x // SCALE - BORDER
            dark = 0 <= module_x < SIZE and 0 <= module_y < SIZE and matrix[module_y][module_x]
            row.extend(DARK if dark else LIGHT)
        rows.append(bytes(row))

    raw = b"".join(rows)
    png = b"\x89PNG\r\n\x1a\n"
    png += png_chunk(b"IHDR", struct.pack(">IIBBBBB", pixel_size, pixel_size, 8, 2, 0, 0, 0))
    png += png_chunk(b"IDAT", zlib.compress(raw, 9))
    png += png_chunk(b"IEND", b"")
    OUT_FILE.write_bytes(png)


def main():
    link = LINK_FILE.read_text(encoding="utf-8").strip()
    matrix, reserved = new_matrix()
    draw_patterns(matrix, reserved)
    place_data(matrix, reserved, make_codewords(link))
    draw_format(matrix, reserved)
    write_png(matrix)


if __name__ == "__main__":
    main()
