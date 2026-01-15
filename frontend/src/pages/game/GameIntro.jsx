import { useState } from 'react';
import './GameIntro.css';

// TODO: 버튼 대신 초로, skip 버튼만 남기기
const GameIntro = ({ onComplete }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = [
        {
            title: "지어봐요 마이홈에 오신 걸 환영합니다!",
            description: "동물의 숲 세계에서 나만의 집을 완성하세요!",
            image: "/assets/intro/intro1.png"
        },
        {
            title: "주사위를 굴려 보드판을 돌아다니세요",
            description: "각 칸에서 다양한 이벤트가 발생합니다!",
            image: "/assets/intro/intro2.png"
        },
        {
            title: "자원을 모아 집을 업그레이드하세요!",
            description: "나무, 철, 점토 등 자원을 수집하세요.",
            image: "/assets/intro/intro3.png"
        },
        {
            title: "가장 먼저 집을 완성한 사람이 승리!",
            description: "준비되셨나요?",
            image: "/assets/intro/intro4.png"
        }
    ];

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            onComplete();  // 마지막이면 게임 시작
        }
    };

    const slide = slides[currentSlide];

    return (
        <div className="intro-container">
            <div className="intro-content">
                <h1>{slide.title}</h1>
                <p>{slide.description}</p>
                <div className="intro-image">
                    <img src={slide.image} alt="게임 설명" />
                </div>
            </div>

            <div className="intro-nav">
                <div className="dots">
                    {slides.map((_, idx) => (
                        <span
                            key={idx}
                            className={`dot ${idx === currentSlide ? 'active' : ''}`}
                        />
                    ))}
                </div>
                <button onClick={handleNext}>
                    {currentSlide < slides.length - 1 ? '다음' : '게임 시작'}
                </button>
            </div>
        </div>
    );
};

export default GameIntro;