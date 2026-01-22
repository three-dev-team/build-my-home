import { useEffect, useMemo, useRef } from "react";

export default function Inventory({ player, onClose }) {
    const overlayRef = useRef(null);

    // ESC 누르면 인벤 닫기
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    // 오버레이 바깥 클릭하면 닫기
    const handleOverlayMouseDown = (e) => {
        if (e.target === overlayRef.current) onClose?.();
    };

    // player 없으면 렌더링 안 함
    if (!player) return null;

    // 표시 순서(카테고리 내부에서 "끼워넣기" 됨)
    const RESOURCE_ORDER = ["STONE", "WOOD", "IRON", "CLOTH", "BRICK", "WALLPAPER", "CLAY", "FLOORING"];
    const FRUIT_ORDER = ["APPLE", "ORANGE", "PEAR", "PEACH", "CHERRY"];
    const FISH_ORDER = ["FISH_SMALL", "FISH_MEDIUM", "FISH_LARGE"];

    // UI에 표시할 한글 라벨
    const koName = (key) => {
        const map = {
            STONE: "돌",
            WOOD: "목재",
            IRON: "철광석",
            CLOTH: "천",
            BRICK: "벽돌",
            WALLPAPER: "벽지",
            CLAY: "점토",
            FLOORING: "바닥재",

            APPLE: "사과",
            ORANGE: "오렌지",
            PEAR: "배",
            PEACH: "복숭아",
            CHERRY: "체리",

            FISH_SMALL: "작은 물고기",
            FISH_MEDIUM: "중간 물고기",
            FISH_LARGE: "큰 물고기",
        };
        return map[key] || key;
    };

    // resources/harvests에서 수량 안전하게 읽기
    const getCount = (mapObj, key) => {
        if (!mapObj) return 0;
        const v = mapObj[key];
        return typeof v === "number" ? v : 0;
    };

    // 가진 것만, ORDER 순서대로 entries 생성
    const entries = useMemo(() => {
        const list = [];

        const pushIfOwned = (prefix, key, count, imgKey = key) => {
            if (!count || count <= 0) return;

            list.push({
                key: `${prefix}_${key}`,
                label: koName(key),
                count,
                srcCandidates: [
                    `/images/inventory/${imgKey}.webp`,
                    `/images/inventory/${imgKey}.png`,
                ],
            });
        };

        for (const k of RESOURCE_ORDER) {
            pushIfOwned("RES", k, getCount(player.resources, k));
        }

        for (const k of FRUIT_ORDER) {
            pushIfOwned("HAR", k, getCount(player.harvests, k));
        }

        // 물고기는 낚시로 획득한 게 harvests에 쌓인다는 전제
        for (const k of FISH_ORDER) {
            pushIfOwned("FISH", k, getCount(player.harvests, k));
        }

        return list;
    }, [player.resources, player.harvests]);

    // 8개 x 3줄 = 24개
    const DOTS = [
        [20, 24], [28, 24], [36, 24], [44, 24], [52, 24], [60, 24], [68, 24], [76, 24],
        [20, 38], [28, 38], [36, 38], [44, 38], [52, 38], [60, 38], [68, 38], [76, 38],
        [20, 52], [28, 52], [36, 52], [44, 52], [52, 52], [60, 52], [68, 52], [76, 52],
    ];

    const dotItems = entries.slice(0, DOTS.length);
    const overflowItems = entries.slice(DOTS.length);

    return (
        <div
            ref={overlayRef}
            onMouseDown={handleOverlayMouseDown}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 10000,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                paddingTop: 80,
                background: "rgba(0,0,0,0.25)",
            }}
        >
            <div style={{ position: "relative", width: 920, maxWidth: "92vw" }}>
                <img
                    src="/images/inventory/inventory.webp"
                    alt="inventory"
                    style={{
                        width: "100%",
                        height: "auto",
                        display: "block",
                        userSelect: "none",
                    }}
                    draggable={false}
                />

                <button
                    onClick={onClose}
                    style={{
                        position: "absolute",
                        right: "3.2%",
                        top: "50%",
                        transform: "translateY(-50%)",
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: "none",
                        background: "rgba(0,0,0,0.55)",
                        color: "white",
                        fontWeight: 800,
                        cursor: "pointer",
                    }}
                >
                    닫기
                </button>

                {dotItems.map((it, idx) => {
                    const [x, y] = DOTS[idx];
                    return (
                        <div
                            key={it.key}
                            title={`${it.label} : ${it.count}`}
                            style={{
                                position: "absolute",
                                left: `${x}%`,
                                top: `${y}%`,
                                transform: "translate(-50%, -50%)",
                                width: "clamp(26px, 4.2vw, 56px)",
                                height: "clamp(26px, 4.2vw, 56px)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                pointerEvents: "none",
                            }}
                        >
                            <SmartImage
                                srcCandidates={it.srcCandidates}
                                alt={it.label}
                                style={{
                                    width: "90%",
                                    height: "90%",
                                    objectFit: "contain",
                                    filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.25))",
                                    userSelect: "none",
                                }}
                            />
                            <div
                                style={{
                                    position: "absolute",
                                    right: -2,
                                    bottom: -2,
                                    minWidth: 22,
                                    height: 18,
                                    padding: "0 6px",
                                    borderRadius: 999,
                                    background: "rgba(0,0,0,0.60)",
                                    color: "white",
                                    fontSize: 12,
                                    fontWeight: 900,
                                    lineHeight: "18px",
                                    textAlign: "center",
                                }}
                            >
                                {it.count}
                            </div>
                        </div>
                    );
                })}

                {overflowItems.length > 0 && (
                    <div
                        style={{
                            position: "absolute",
                            left: "10%",
                            right: "10%",
                            bottom: "6%",
                            padding: "10px 12px",
                            borderRadius: 12,
                            background: "rgba(0,0,0,0.35)",
                            color: "white",
                            fontSize: 12,
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                            pointerEvents: "auto",
                        }}
                    >
                        {overflowItems.map((it) => (
                            <div
                                key={it.key}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "6px 8px",
                                    borderRadius: 10,
                                    background: "rgba(255,255,255,0.10)",
                                }}
                            >
                                <SmartImage
                                    srcCandidates={it.srcCandidates}
                                    alt={it.label}
                                    style={{ width: 22, height: 22, objectFit: "contain" }}
                                />
                                <span style={{ fontWeight: 800 }}>{it.label}</span>
                                <span style={{ opacity: 0.9 }}>x{it.count}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// 이미지 후보를 순서대로 시도
function SmartImage({ srcCandidates, alt, style }) {
    const imgRef = useRef(null);
    const idxRef = useRef(0);

    const onError = () => {
        const nextIdx = (idxRef.current || 0) + 1;
        idxRef.current = nextIdx;

        const next = srcCandidates?.[nextIdx];
        if (imgRef.current && next) {
            imgRef.current.src = next;
            return;
        }

        if (imgRef.current) imgRef.current.style.opacity = "0";
    };

    const first = srcCandidates?.[0] || "";
    return (
        <img
            ref={imgRef}
            src={first}
            alt={alt}
            style={style}
            draggable={false}
            onError={onError}
        />
    );
}
