// constants/houseLevel.js
// TODO: 반드시 서버 데이터(HouseLevel.java)와 일치해야 함

export const HOUSE_LEVELS = [
    { level: 0, key: "NONE", name: "없음", bell: 0 },
    { level: 1, key: "LAND", name: "땅", bell: 300 },
    { level: 2, key: "TENT", name: "텐트", bell: 400, cloth: 1, iron: 1 },
    { level: 3, key: "HOUSE_1", name: "집(1)", bell: 1000, iron: 1, clay: 1 },
    { level: 4, key: "HOUSE_2", name: "집(2)", bell: 1800, iron: 3, clay: 3, wood: 3, brick: 3 },
    { level: 5, key: "HOUSE_3", name: "집(3)", bell: 3000, iron: 5, clay: 5, brick: 5, wallpaper: 5, flooring: 5 },
];