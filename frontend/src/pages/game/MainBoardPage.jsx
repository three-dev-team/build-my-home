import {useParams} from "react-router-dom";
import {boardTiles} from '../../constants/boardData';
import './MainBoardPage.css';

const MainBoardPage = () => {

    const { roomId } = useParams();

    // 보드판 배치: 32칸을 4변으로 나눔 (각 변 9칸: 코너 포함)
    const topRow = boardTiles.slice(0, 7);        // 0-6
    const rightCol = boardTiles.slice(7, 12);     // 7-11
    const bottomRow = boardTiles.slice(12, 19).reverse(); // 12-18 (역순)
    const leftCol = boardTiles.slice(19, 24).reverse();   // 19-23 (역순)

    const getTileColor = (type) => {
        const colors = {
            START: '#FFD700',
            STAMP_BLUE: '#4A90D9',
            STAMP_YELLOW: '#F5D547',
            STAMP_RED: '#E74C3C',
            STAMP_GREEN: '#2ECC71',
            SHOP_RESOURCE: '#9B59B6',
            SHOP_ITEM: '#E91E63',
            RESOURCE: '#8B4513',
            FRUIT: '#FF6B6B',
            LOAN: '#34495E',
            FISHING: '#00BCD4',
            KK: '#FF9800',
        };
        return colors[type] || '#CCC';
    };

    return (
        <div className="game-board">
            {/* 상단 행 */}
            <div className="board-row top">
                {topRow.map((tile) => (
                    <div
                        key={tile.id}
                        className="tile"
                        style={{backgroundColor: getTileColor(tile.type)}}
                    >
                        <span className="tile-id">{tile.id}</span>
                        <span className="tile-name">{tile.name}</span>
                    </div>
                ))}
            </div>

            {/* 중간 영역 */}
            <div className="board-middle">
                {/* 왼쪽 열 */}
                <div className="board-col left">
                    {leftCol.map((tile) => (
                        <div
                            key={tile.id}
                            className="tile"
                            style={{backgroundColor: getTileColor(tile.type)}}
                        >
                            <span className="tile-id">{tile.id}</span>
                            <span className="tile-name">{tile.name}</span>
                        </div>
                    ))}
                </div>

                {/* 가운데 (플레이어 정보 영역) */}
                <div className="board-center">
                    <h2>지어봐요 마이홈</h2>
                    {/* 플레이어 정보, 주사위 등 */}
                </div>

                {/* 오른쪽 열 */}
                <div className="board-col right">
                    {rightCol.map((tile) => (
                        <div
                            key={tile.id}
                            className="tile"
                            style={{backgroundColor: getTileColor(tile.type)}}
                        >
                            <span className="tile-id">{tile.id}</span>
                            <span className="tile-name">{tile.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 하단 행 */}
            <div className="board-row bottom">
                {bottomRow.map((tile) => (
                    <div
                        key={tile.id}
                        className="tile"
                        style={{backgroundColor: getTileColor(tile.type)}}
                    >
                        <span className="tile-id">{tile.id}</span>
                        <span className="tile-name">{tile.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MainBoardPage;