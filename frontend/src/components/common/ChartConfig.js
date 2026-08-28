import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register all required Chart.js controllers and elements once
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const STITCH_COLORS = {
  primary: '#005d42',
  primaryContainer: '#047857',
  secondary: '#006e2d',
  secondaryContainer: '#7cf994',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  amber: '#f59e0b',
  tertiary: '#495167',
  surfaceVariant: '#d3e4fe',
  outlineVariant: '#bdc9c1',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#3e4943',
};

export default ChartJS;
