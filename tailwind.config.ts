import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
    darkMode: "class",
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		animation: {
  			'kynthai-gradient': 'kynthai-gradient 3s ease infinite',
  			'kynthai-float': 'kynthai-float 4s ease-in-out infinite',
  			'kynthai-pulse-soft': 'kynthai-pulse-soft 2.5s ease-in-out infinite',
  			'kynthai-fade-in-up': 'kynthai-fade-in-up 0.5s ease-out',
  			'kynthai-scale-in': 'kynthai-scale-in 0.3s ease-out',
  		},
  		keyframes: {
  			'kynthai-gradient': {
  				'0%, 100%': { backgroundPosition: '0% 50%' },
  				'50%': { backgroundPosition: '100% 50%' },
  			},
  			'kynthai-float': {
  				'0%, 100%': { transform: 'translateY(0px)' },
  				'50%': { transform: 'translateY(-8px)' },
  			},
  			'kynthai-pulse-soft': {
  				'0%, 100%': { opacity: '0.85', transform: 'scale(1)' },
  				'50%': { opacity: '1', transform: 'scale(1.04)' },
  			},
  			'kynthai-fade-in-up': {
  				'from': { opacity: '0', transform: 'translateY(12px)' },
  				'to': { opacity: '1', transform: 'translateY(0)' },
  			},
  			'kynthai-scale-in': {
  				'from': { opacity: '0', transform: 'scale(0.95)' },
  				'to': { opacity: '1', transform: 'scale(1)' },
  			},
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [tailwindcssAnimate],
};
export default config;
