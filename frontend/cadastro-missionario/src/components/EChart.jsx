import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export default function EChart({ option, className = 'h-80' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return undefined;

    const chart = echarts.init(ref.current, null, { renderer: 'canvas' });
    chart.setOption(option, true);

    const resize = () => chart.resize();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      chart.dispose();
    };
  }, [option]);

  return <div ref={ref} className={`w-full ${className}`} />;
}
