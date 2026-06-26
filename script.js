// 后续替换媒体时，只需保持 assets 文件夹中的文件名不变。
const ASSETS = {
  videos: [
    "assets/videos/lesson1.mp4",
    "assets/videos/lesson2.mp4",
    "assets/videos/lesson3.mp4",
    "assets/videos/lesson4.mp4",
    "assets/videos/lesson5.mp4"
  ],
  images: {
    tenon: "assets/images/tenon.jpg",
    mortise: "assets/images/mortise.jpg",
    straightJoint: "assets/images/straight-joint.jpg",
    crossJoint: "assets/images/cross-joint.jpg",
    dovetail: "assets/images/dovetail.jpg",
    shoulderJoint: "assets/images/shoulder-joint.jpg"
  }
};

const lessons = [
  {
    number: "01",
    level: "第一关",
    title: "认识榫和卯",
    video: "第一课：什么是榫卯？",
    knowledge: "凸出来的部分叫榫，凹进去的部分叫卯。榫插进卯里，木件就可以连接在一起。",
    question: "请在两个木构件中选择“榫头”",
    stamp: "木",
    type: "identify"
  },
  {
    number: "02",
    level: "第二关",
    title: "榫卯为什么能连接",
    video: "第二课：形状匹配的秘密",
    knowledge: "榫卯依靠形状匹配和互相咬合完成连接。榫头太大插不进去，太小会松动，大小合适才能稳定。",
    question: "哪个榫头能刚好插入这个卯口？",
    stamp: "合",
    type: "match"
  },
  {
    number: "03",
    level: "第三关",
    title: "常见榫卯结构",
    video: "第三课：榫卯家族大集合",
    knowledge: "常见榫卯包括直榫、十字榫、燕尾榫、抱肩榫和斗拱组合。燕尾榫外宽内窄，像燕子的尾巴，不容易被拉开。",
    question: "请在三张结构卡片中选出燕尾榫",
    stamp: "识",
    type: "dovetail"
  },
  {
    number: "04",
    level: "第四关",
    title: "榫卯难度排序",
    video: "第四课：从木件到小亭",
    knowledge: "榫卯学习可以从简单到复杂：基础插接最简单，家具组装需要理解部件关系，建筑场景组合最复杂。",
    question: "请按照从简单到困难重新排序",
    stamp: "序",
    type: "sort"
  },
  {
    number: "05",
    level: "第五关",
    title: "椅子榫卯组装",
    video: "第五课：一把小椅子怎样站稳",
    knowledge: "椅子由椅腿、椅面、横档、靠背等部件组成。横档可以让椅腿之间互相支撑，使椅子更加稳定。",
    question: "请按顺序组装一把小椅子",
    stamp: "匠",
    type: "chair"
  }
];

const screens = {
  start: document.querySelector("#start-screen"),
  lesson: document.querySelector("#lesson-screen"),
  finish: document.querySelector("#finish-screen")
};

const ui = {
  lessonNumber: document.querySelector("#lesson-number"),
  lessonTitle: document.querySelector("#lesson-title"),
  levelLabel: document.querySelector("#level-label"),
  progressCount: document.querySelector("#progress-count"),
  progressFill: document.querySelector("#progress-fill"),
  stampMini: document.querySelector("#stamp-mini"),
  videoTitle: document.querySelector("#video-title"),
  knowledgeText: document.querySelector("#knowledge-text"),
  questionText: document.querySelector("#question-text"),
  interactionArea: document.querySelector("#interaction-area"),
  feedback: document.querySelector("#feedback"),
  feedbackIcon: document.querySelector("#feedback-icon"),
  feedbackText: document.querySelector("#feedback-text"),
  nextButton: document.querySelector("#next-btn"),
  lessonScroll: document.querySelector(".lesson-scroll"),
  videoPlaying: document.querySelector("#video-playing"),
  lessonVideo: document.querySelector("#lesson-video"),
  videoFallback: document.querySelector("#video-fallback"),
  videoStatus: document.querySelector("#video-status")
};

let currentLesson = 0;
let lessonComplete = false;
let chairStep = 0;
let selectedSortItem = null;

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");
}

function startCourse() {
  currentLesson = 0;
  renderLesson();
  showScreen("lesson");
}

function renderLesson() {
  const lesson = lessons[currentLesson];
  lessonComplete = false;
  chairStep = 0;
  selectedSortItem = null;

  ui.lessonNumber.textContent = lesson.number;
  ui.lessonTitle.textContent = lesson.title;
  ui.levelLabel.textContent = lesson.level;
  ui.progressCount.textContent = `${currentLesson + 1} / ${lessons.length}`;
  ui.progressFill.style.width = `${((currentLesson + 1) / lessons.length) * 100}%`;
  ui.stampMini.textContent = lesson.stamp;
  ui.stampMini.classList.remove("earned");
  ui.videoTitle.textContent = lesson.video;
  ui.lessonVideo.src = ASSETS.videos[currentLesson];
  ui.lessonVideo.load();
  ui.lessonVideo.hidden = false;
  ui.videoFallback.hidden = true;
  ui.videoStatus.textContent = "视频加载中...";
  ui.knowledgeText.textContent = lesson.knowledge;
  ui.questionText.textContent = lesson.question;
  ui.feedback.hidden = true;
  ui.feedback.className = "feedback";
  ui.videoPlaying.hidden = true;
  ui.nextButton.disabled = true;
  ui.nextButton.querySelector("span").textContent = "完成挑战后继续";
  ui.lessonScroll.scrollTop = 0;

  const renderers = {
    identify: renderIdentify,
    match: renderMatch,
    dovetail: renderDovetail,
    sort: renderSort,
    chair: renderChair
  };

  renderers[lesson.type]();
}

function setFeedback(success, message) {
  ui.feedback.hidden = false;
  ui.feedback.className = `feedback ${success ? "success" : "error"}`;
  ui.feedbackIcon.dataset.symbol = success ? "✓" : "↻";
  ui.feedbackText.textContent = message;
}

function completeLesson(message) {
  if (lessonComplete) return;
  lessonComplete = true;
  setFeedback(true, message);
  ui.stampMini.classList.add("earned");
  ui.nextButton.disabled = false;
  ui.nextButton.querySelector("span").textContent =
    currentLesson === lessons.length - 1 ? "领取小匠人印章" : "带着印章去下一关";
}

function bindChoices(correctIndex, successMessage, errorMessage) {
  const buttons = ui.interactionArea.querySelectorAll(".choice-card");
  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      if (lessonComplete) return;
      buttons.forEach((item) => item.classList.remove("wrong"));
      if (index === correctIndex) {
        button.classList.add("correct");
        buttons.forEach((item) => {
          item.disabled = true;
        });
        completeLesson(successMessage);
      } else {
        button.classList.add("wrong");
        setFeedback(false, errorMessage);
        window.setTimeout(() => button.classList.remove("wrong"), 500);
      }
    });
  });
}

function imageChoice(path, fallbackClass, alt) {
  return `
    <div class="media-visual">
      <img class="asset-image" src="${path}" alt="${alt}">
      <div class="wood-shape ${fallbackClass}" aria-hidden="true"></div>
    </div>
  `;
}

function bindImageFallbacks() {
  ui.interactionArea.querySelectorAll(".asset-image").forEach((image) => {
    const showImage = () => image.parentElement.classList.add("image-loaded");
    if (image.complete && image.naturalWidth > 0) {
      showImage();
    } else {
      image.addEventListener("load", showImage, { once: true });
      image.addEventListener("error", () => image.remove(), { once: true });
    }
  });
}

function renderIdentify() {
  ui.interactionArea.innerHTML = `
    <div class="option-grid option-grid-two">
      <button class="choice-card" type="button">
        ${imageChoice(ASSETS.images.mortise, "shape-mortise", "卯口")}
        <span>木构件 A</span>
      </button>
      <button class="choice-card" type="button">
        ${imageChoice(ASSETS.images.tenon, "shape-tenon", "榫头")}
        <span>木构件 B</span>
      </button>
    </div>
  `;

  bindImageFallbacks();
  bindChoices(
    1,
    "答对啦！凸出来的是榫。",
    "再观察一下，榫是凸出来的部分哦。"
  );
}

function renderMatch() {
  ui.interactionArea.innerHTML = `
    <div class="match-stage">
      <div class="snap-tenon" id="snap-tenon"></div>
      <div class="mortise-block"><div class="mortise-hole"></div></div>
      <span class="target-label">等待合适的榫头</span>
    </div>
    <div class="option-grid">
      <button class="choice-card" type="button">
        <div class="wood-shape shape-tenon size-small" aria-hidden="true"></div>
        <span>偏小</span>
      </button>
      <button class="choice-card" type="button">
        <div class="wood-shape shape-tenon" aria-hidden="true"></div>
        <span>刚刚好</span>
      </button>
      <button class="choice-card" type="button">
        <div class="wood-shape shape-tenon size-large" aria-hidden="true"></div>
        <span>偏大</span>
      </button>
    </div>
  `;

  const buttons = ui.interactionArea.querySelectorAll(".choice-card");
  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      if (lessonComplete) return;
      buttons.forEach((item) => item.classList.remove("wrong"));
      if (index === 1) {
        button.classList.add("correct");
        buttons.forEach((item) => {
          item.disabled = true;
        });
        document.querySelector("#snap-tenon").classList.add("animate");
        document.querySelector(".target-label").textContent = "咔哒！连接成功";
        window.setTimeout(() => {
          completeLesson("咔哒！大小合适，榫头和卯口牢牢咬合。");
        }, 650);
      } else {
        button.classList.add("wrong");
        setFeedback(false, "这个大小不匹配，换一个试试。");
        window.setTimeout(() => button.classList.remove("wrong"), 500);
      }
    });
  });
}

function renderDovetail() {
  ui.interactionArea.innerHTML = `
    <div class="option-grid">
      <button class="choice-card" type="button">
        ${imageChoice(ASSETS.images.straightJoint, "straight-joint", "直榫")}
        <span>直榫</span>
      </button>
      <button class="choice-card" type="button">
        ${imageChoice(ASSETS.images.dovetail, "dovetail", "燕尾榫")}
        <span>燕尾榫</span>
      </button>
      <button class="choice-card" type="button">
        ${imageChoice(ASSETS.images.crossJoint, "cross-joint", "十字榫")}
        <span>十字榫</span>
      </button>
    </div>
  `;

  bindImageFallbacks();
  bindChoices(
    1,
    "找到了！燕尾榫外宽内窄，像燕子的尾巴。",
    "再看一看，燕尾榫的外形像燕子尾巴。"
  );
}

function renderSort() {
  const tasks = [
    { id: "pavilion", name: "小亭场景搭建", icon: "亭" },
    { id: "basic", name: "基础榫卯插接", icon: "榫" },
    { id: "chair", name: "小椅子组装", icon: "椅" }
  ];

  ui.interactionArea.innerHTML = `
    <div class="sort-list" id="sort-list">
      ${tasks.map((task, index) => `
        <div class="sort-item" draggable="true" tabindex="0" data-id="${task.id}">
          <span class="sort-number">${index + 1}</span>
          <span class="task-picture">${task.icon}</span>
          <strong>${task.name}</strong>
          <span class="drag-handle" aria-hidden="true">≡</span>
        </div>
      `).join("")}
    </div>
    <div class="sort-actions">
      <button class="secondary-btn" id="sort-reset" type="button">重新排列</button>
      <button class="secondary-btn" id="sort-check" type="button">检查顺序</button>
    </div>
  `;

  const list = document.querySelector("#sort-list");
  let dragged = null;

  function updateNumbers() {
    list.querySelectorAll(".sort-item").forEach((item, index) => {
      item.querySelector(".sort-number").textContent = index + 1;
    });
  }

  list.querySelectorAll(".sort-item").forEach((item) => {
    item.addEventListener("dragstart", () => {
      dragged = item;
      item.classList.add("dragging");
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
      dragged = null;
      updateNumbers();
    });

    item.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (dragged && dragged !== item) {
        const rect = item.getBoundingClientRect();
        const after = event.clientY > rect.top + rect.height / 2;
        list.insertBefore(dragged, after ? item.nextSibling : item);
      }
    });

    item.addEventListener("click", () => {
      if (!selectedSortItem) {
        selectedSortItem = item;
        item.classList.add("selected");
        return;
      }

      if (selectedSortItem === item) {
        item.classList.remove("selected");
        selectedSortItem = null;
        return;
      }

      const placeholder = document.createElement("div");
      const firstNext = selectedSortItem.nextSibling;
      const secondNext = item.nextSibling;
      list.insertBefore(placeholder, selectedSortItem);
      list.insertBefore(selectedSortItem, secondNext);
      list.insertBefore(item, firstNext === item ? selectedSortItem : firstNext);
      placeholder.remove();
      selectedSortItem.classList.remove("selected");
      selectedSortItem = null;
      updateNumbers();
    });
  });

  document.querySelector("#sort-reset").addEventListener("click", renderSort);
  document.querySelector("#sort-check").addEventListener("click", () => {
    const order = [...list.querySelectorAll(".sort-item")].map((item) => item.dataset.id);
    if (order.join(",") === "basic,chair,pavilion") {
      list.querySelectorAll(".sort-item").forEach((item, index) => {
        item.style.animationDelay = `${index * 0.12}s`;
        item.classList.add("stair");
        item.draggable = false;
      });
      completeLesson("难度排序完成！零件越多、步骤越多，挑战也会更复杂。");
    } else {
      setFeedback(false, "想一想，哪个任务零件最少？哪个任务步骤最多？");
    }
  });
}

function renderChair() {
  ui.interactionArea.innerHTML = `
    <div class="chair-stage">
      <div class="chair-build" id="chair-build">
        <div class="chair-part chair-leg leg-left" data-chair-part="legs"></div>
        <div class="chair-part chair-leg leg-right" data-chair-part="legs"></div>
        <div class="chair-part chair-seat" data-chair-part="seat"></div>
        <div class="chair-part chair-rail" data-chair-part="rail"></div>
        <div class="chair-part chair-back" data-chair-part="back"></div>
      </div>
    </div>
    <div class="parts-tray">
      <button class="part-btn" type="button" data-step="0"><b>╽╽</b><span>椅腿</span></button>
      <button class="part-btn" type="button" data-step="1"><b>▬</b><span>椅面</span></button>
      <button class="part-btn" type="button" data-step="2"><b>━</b><span>横档</span></button>
      <button class="part-btn" type="button" data-step="3"><b>╧</b><span>靠背</span></button>
    </div>
  `;

  const partNames = ["椅腿", "椅面", "横档", "靠背"];
  const partKeys = ["legs", "seat", "rail", "back"];
  const buttons = ui.interactionArea.querySelectorAll(".part-btn");
  const chair = document.querySelector("#chair-build");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      if (lessonComplete || button.classList.contains("used")) return;
      const selectedStep = Number(button.dataset.step);

      if (selectedStep !== chairStep) {
        button.classList.add("wrong");
        if (chairStep === 2 && selectedStep === 3) {
          chair.classList.remove("wobble");
          void chair.offsetWidth;
          chair.classList.add("wobble");
          setFeedback(false, "椅子有一点摇晃。先加上横档，椅腿才会互相支撑哦。");
        } else {
          setFeedback(false, `快接近啦！下一步先找一找“${partNames[chairStep]}”。`);
        }
        window.setTimeout(() => button.classList.remove("wrong"), 500);
        return;
      }

      button.classList.add("used");
      document.querySelectorAll(`[data-chair-part="${partKeys[chairStep]}"]`).forEach((part) => {
        part.classList.add("placed");
      });
      chairStep += 1;

      if (selectedStep === 2) {
        chair.classList.remove("wobble");
        chair.classList.add("stable");
        setFeedback(true, "横档放对啦！椅腿有了支撑，椅子变稳定了。");
      } else if (chairStep < 4) {
        setFeedback(true, `${partNames[selectedStep]}安装好啦，继续找下一个部件。`);
      } else {
        completeLesson("小椅子组装完成！每个部件都在互相支撑。");
      }
    });
  });
}

document.querySelector("#start-btn").addEventListener("click", startCourse);
document.querySelector("#home-btn").addEventListener("click", () => showScreen("start"));
document.querySelector("#restart-btn").addEventListener("click", startCourse);

ui.nextButton.addEventListener("click", () => {
  if (!lessonComplete) return;
  if (currentLesson < lessons.length - 1) {
    currentLesson += 1;
    renderLesson();
  } else {
    showScreen("finish");
  }
});

document.querySelector("#play-btn").addEventListener("click", () => {
  ui.videoPlaying.hidden = false;
  ui.lessonVideo.play().catch(() => {
    ui.videoStatus.textContent = "视频尚未放入，请替换 assets/videos 中的同名文件。";
  });
});

document.querySelector("#close-video").addEventListener("click", () => {
  ui.lessonVideo.pause();
  ui.videoPlaying.hidden = true;
});

ui.lessonVideo.addEventListener("loadeddata", () => {
  ui.lessonVideo.hidden = false;
  ui.videoFallback.hidden = true;
  ui.videoStatus.textContent = lessons[currentLesson].video;
});

ui.lessonVideo.addEventListener("error", () => {
  ui.lessonVideo.hidden = true;
  ui.videoFallback.hidden = false;
  ui.videoStatus.textContent = "视频占位：请放入对应的 lesson 视频文件";
});
