let currentSlide = 0;
let autoSlide;

function createBannerSlider() {
    const container = document.getElementById("banner-slider");

    if (!container || typeof bannerData === "undefined") return;

    container.innerHTML = `
        <div class="banner-slider">
            <div class="banner-track">
                ${bannerData.map((item, index) => `
                    <div class="banner-item ${index === 0 ? "active" : ""}">
                        <img src="${item.image}" alt="${item.title}">
                        <div class="banner-content">
                            <h2>${item.title}</h2>
                            <p>${item.subtitle}</p>
                            <span>${item.offer}</span>
                            <a href="${item.link}" class="banner-btn">${item.button}</a>
                        </div>
                    </div>
                `).join("")}
            </div>

            <button class="banner-prev">&#10094;</button>
            <button class="banner-next">&#10095;</button>

            <div class="banner-dots">
                ${bannerData.map((_, index) => `
                    <span class="dot ${index === 0 ? "active" : ""}" data-slide="${index}"></span>
                `).join("")}
            </div>
        </div>
    `;

    initBannerSlider();
}

function initBannerSlider() {
    const slides = document.querySelectorAll(".banner-item");
    const dots = document.querySelectorAll(".dot");

    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove("active"));
        dots.forEach(dot => dot.classList.remove("active"));

        slides[index].classList.add("active");
        dots[index].classList.add("active");

        currentSlide = index;
    }

    document.querySelector(".banner-next").onclick = () => {
        showSlide((currentSlide + 1) % slides.length);
    };

    document.querySelector(".banner-prev").onclick = () => {
        showSlide((currentSlide - 1 + slides.length) % slides.length);
    };

    dots.forEach(dot => {
        dot.onclick = () => showSlide(Number(dot.dataset.slide));
    });

    autoSlide = setInterval(() => {
        showSlide((currentSlide + 1) % slides.length);
    }, 4000);
}

document.addEventListener("DOMContentLoaded", createBannerSlider);
