/**
 * Los iconos del producto, en UN solo módulo.
 *
 * Importar de `lucide-react` en cada componente parece más simple y produce dos problemas: el mismo
 * concepto acaba dibujado con dos iconos distintos en dos pantallas —la racha con una llama aquí y con un
 * rayo allá—, y no hay forma de responder "¿qué icono usa este producto para 'unidad completa'?" sin abrir
 * quince archivos.
 *
 * Aquí el nombre es del DOMINIO, no del dibujo: `streak`, no `flame`. El día que la racha deje de ser una
 * llama se cambia en una línea y no en once.
 */
export {
  Flame as StreakIcon,
  Gem as GemIcon,
  Heart as HeartIcon,
  Infinity as UnlimitedIcon,
  Snowflake as FreezeIcon,
  Zap as ComboIcon,
  Trophy as LeagueIcon,
  Target as QuestIcon,
  ShoppingBag as ShopIcon,
  Map as PathIcon,
  RefreshCw as PracticeIcon,
  Award as BadgeIcon,
  User as ProfileIcon,
  Check as DoneIcon,
  Lock as LockedIcon,
  Play as StartIcon,
  Star as CheckpointIcon,
  ChevronRight as NextIcon,
  X as CloseIcon,
  Keyboard as ShortcutsIcon,
  TrendingUp as PromoteIcon,
  TrendingDown as DemoteIcon,
  Clock as TimeIcon,
  CircleCheck as AccuracyIcon,
  Sparkles as PerfectIcon,
  BookOpen as LessonIcon,
} from 'lucide-react';
