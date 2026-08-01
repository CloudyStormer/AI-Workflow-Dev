import arrowLeft from '../assets/icons/arrow-left.svg'
import bell from '../assets/icons/bell.svg'
import bookOpen from '../assets/icons/book-open.svg'
import caretRight from '../assets/icons/caret-right.svg'
import chartBar from '../assets/icons/chart-bar.svg'
import chatCircleDots from '../assets/icons/chat-circle-dots.svg'
import checkCircle from '../assets/icons/check-circle.svg'
import clock from '../assets/icons/clock.svg'
import dotsThree from '../assets/icons/dots-three.svg'
import fire from '../assets/icons/fire.svg'
import gearSix from '../assets/icons/gear-six.svg'
import house from '../assets/icons/house.svg'
import magnifyingGlass from '../assets/icons/magnifying-glass.svg'
import microphone from '../assets/icons/microphone.svg'
import moon from '../assets/icons/moon.svg'
import palette from '../assets/icons/palette.svg'
import paperPlaneRight from '../assets/icons/paper-plane-right.svg'
import signOut from '../assets/icons/sign-out.svg'
import slidersHorizontal from '../assets/icons/sliders-horizontal.svg'
import smiley from '../assets/icons/smiley.svg'
import speakerHigh from '../assets/icons/speaker-high.svg'
import sun from '../assets/icons/sun.svg'
import target from '../assets/icons/target.svg'
import userCircle from '../assets/icons/user-circle.svg'

const icons = {
  'arrow-left': arrowLeft,
  bell,
  'book-open': bookOpen,
  'caret-right': caretRight,
  'chart-bar': chartBar,
  'chat-circle-dots': chatCircleDots,
  'check-circle': checkCircle,
  clock,
  'dots-three': dotsThree,
  fire,
  'gear-six': gearSix,
  house,
  'magnifying-glass': magnifyingGlass,
  microphone,
  moon,
  palette,
  'paper-plane-right': paperPlaneRight,
  'sign-out': signOut,
  'sliders-horizontal': slidersHorizontal,
  smiley,
  'speaker-high': speakerHigh,
  sun,
  target,
  'user-circle': userCircle,
} as const

export type IconName = keyof typeof icons

type IconProps = {
  name: IconName
  size?: number
  className?: string
}

function Icon({ name, size = 24, className = '' }: IconProps) {
  return (
    <img
      src={icons[name]}
      alt=""
      aria-hidden="true"
      className={`icon ${className}`.trim()}
      width={size}
      height={size}
    />
  )
}

export default Icon
