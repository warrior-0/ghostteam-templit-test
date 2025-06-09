window.addEventListener("DOMContentLoaded", () => {
  const sliderContainer = document.getElementById("popular-slider");

  if (!sliderContainer || typeof urbanData === "undefined") return;

  const sorted = [...urbanData].sort((a, b) => b.likes - a.likes).slice(0, 5);

  sorted.forEach((story) => {
    const slide = document.createElement("div");
    slide.classList.add("slide");
    slide.innerHTML = `
      <img src="${story.thumb}" alt="${story.title}">
      <h4>${story.title}</h4>
      <p>${story.body.substring(0, 60)}...</p>
    `;
    sliderContainer.appendChild(slide);
  });
});
