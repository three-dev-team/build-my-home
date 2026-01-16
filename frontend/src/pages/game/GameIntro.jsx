import { useState, useEffect } from 'react';
import './GameIntro.css';

const GameIntro = ({ onSkip }) => {
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

    // 자동 슬라이드 (5초마다)
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide(prev => {
                if (prev < slides.length - 1) {
                    return prev + 1;
                } else {
                    clearInterval(timer);
                    onSkip();  // 마지막이면 자동으로 넘어감
                    return prev;
                }
            });
        }, 5000);

        return () => clearInterval(timer);
    }, []);

    const slide = slides[currentSlide];

    return (
        <div className="intro-container">
            {currentSlide < slides.length - 1 ? (
                <button className="skip-button" onClick={onSkip}>
                    Skip →
                </button>
            ) : (
                <button className="start-button" onClick={onSkip}>
                    🎮 시작하기
                </button>
            )}


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
            </div>
        </div>
    );
};

export default GameIntro;