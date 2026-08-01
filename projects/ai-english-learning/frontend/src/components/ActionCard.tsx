import { useNavigate } from 'react-router-dom'
import actionSurface from '../assets/ui/action-surface.png'
import Icon, { type IconName } from './Icon'

type ActionCardProps = {
  to: string
  icon: IconName
  title: string
  subtitle: string
}

function ActionCard({ to, icon, title, subtitle }: ActionCardProps) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      className="action-card"
      style={{ backgroundImage: `url(${actionSurface})` }}
      onClick={() => navigate(to)}
      aria-label={`${title}：${subtitle}`}
    >
      <span className="action-card__content">
        <span className="action-card__icon">
          <Icon name={icon} size={54} className="icon--light" />
        </span>
        <span>
          <strong>{title}</strong>
          <small>{subtitle}</small>
        </span>
      </span>
    </button>
  )
}

export default ActionCard
