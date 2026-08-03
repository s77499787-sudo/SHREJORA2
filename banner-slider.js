let current = 0;

function renderBanner() {
    const container = document.getElementById("banner-slider");
    if (!container) return;

    container.innerHTML = `
        <div class="banner-wrapper">
            ${bannerData.map((banner, index) => `
                <div class="banner-slide ${index === 0 ? "active" : ""}">
                    <img src="${banner.image}" alt="${banner.title}">
                    <div class="banner-content">
                        <h2>${banner.title}</h2>
                        <p>${banner.subtitle}</p>
                        <a href="${banner.link}" class="banner-btn">${banner.button}</a>
                    </div>
                </div>
            `).join("")}
        </div>
    `;

    startSlider();
}

function startSlider() {
    const slides = document.querySelectorAll(".banner-slide");

    setInterval(() => {
        slides[current].classList.remove("active");
        current = (current + 1) % slides.length;
        slides[current].classList.add("active");
    }, 4000);
}

document.addEventListener("DOMContentLoaded", renderBanner);
function nextBanner() {
    const slides = document.querySelectorAll(".banner-slide");

    slides[current].classList.remove("active");

    current = (current + 1) % slides.length;

    slides[current].classList.add("active");
}

function prevBanner() {
    const slides = document.querySelectorAll(".banner-slide");

    slides[current].classList.remove("active");

    current = (current - 1 + slides.length) % slides.length;

    slides[current].classList.add("active");
}
