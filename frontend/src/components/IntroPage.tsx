import { useNavigate } from 'react-router-dom'

export default function IntroPage() {
  const navigate = useNavigate()

  return (
    <div className="intro-page">
      <div className="intro-header">
        <div className="intro-logo">사주재무연구소</div>
        <h1 className="intro-title">사주로 읽는 나의 투자</h1>
        <p className="intro-subtitle">
          천간지지의 흐름 속에서 당신의 재물운과 투자 궁합을 발견하세요
        </p>
      </div>

      <div className="intro-cards">
        <div className="intro-card" onClick={() => navigate('/rebalancer')}>
          <div className="intro-card-icon">☯</div>
          <h2 className="intro-card-title">사주 리밸런서</h2>
          <p className="intro-card-desc">
            당신의 사주 팔자를 바탕으로 현재 포트폴리오를 분석하고
            맞춤형 리밸런싱을 제안합니다
          </p>
          <button
            className="btn-primary intro-card-btn"
            onClick={e => { e.stopPropagation(); navigate('/rebalancer') }}
          >
            시작하기
          </button>
        </div>

        <div className="intro-card" onClick={() => navigate('/compatibility')}>
          <div className="intro-card-icon">🔮</div>
          <h2 className="intro-card-title">주식 사주 궁합</h2>
          <p className="intro-card-desc">
            내 사주와 기업 CEO의 사주 궁합으로
            투자 적합도를 분석합니다
          </p>
          <button
            className="btn-primary intro-card-btn"
            onClick={e => { e.stopPropagation(); navigate('/compatibility') }}
          >
            시작하기
          </button>
        </div>
      </div>

      <p className="intro-disclaimer">
        본 서비스는 엔터테인먼트 목적으로 제공되며 실제 투자 조언이 아닙니다.
      </p>
    </div>
  )
}
