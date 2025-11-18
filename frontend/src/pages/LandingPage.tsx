/**
 * Landing page with hero, accordion sections, and demo
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Accordion, type AccordionItem } from '../components/ui/Accordion';
import { 
  Zap, 
  BarChart3, 
  Code, 
  Share2, 
  TrendingUp,
  Shield,
  Rocket,
  Users
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const features: AccordionItem[] = [
    {
      id: 'features',
      title: 'Features',
      defaultOpen: true,
      content: (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-500 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-1">Drag-and-Drop Builder</h4>
              <p className="text-sm text-text-secondary">
                Visual strategy builder with flowchart-style interface. No coding required.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-1">Real-Time Backtesting</h4>
              <p className="text-sm text-text-secondary">
                Test strategies instantly with live progress tracking and detailed metrics.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent-cyan to-primary-500 flex items-center justify-center">
                <Code className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-1">Strategy Comparison</h4>
              <p className="text-sm text-text-secondary">
                Compare up to 3 strategies side-by-side with overlay charts and metrics.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
                <Share2 className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-1">Strategy Library</h4>
              <p className="text-sm text-text-secondary">
                Save, share, and discover strategies in our public marketplace.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'how-it-works',
      title: 'How It Works',
      content: (
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
              <span className="text-primary-400 font-bold">1</span>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-1">Build Your Strategy</h4>
              <p className="text-sm text-text-secondary">
                Use our drag-and-drop builder to create trading strategies. Add indicators, set conditions, and visualize your logic flow.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <span className="text-purple-400 font-bold">2</span>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-1">Backtest Instantly</h4>
              <p className="text-sm text-text-secondary">
                Run backtests on historical data with real-time progress tracking. Get detailed performance metrics in seconds.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <span className="text-indigo-400 font-bold">3</span>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-1">Compare & Optimize</h4>
              <p className="text-sm text-text-secondary">
                Compare multiple strategies, analyze performance, and optimize parameters to improve results.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent-cyan/20 flex items-center justify-center">
              <span className="text-accent-cyan font-bold">4</span>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-1">Save & Share</h4>
              <p className="text-sm text-text-secondary">
                Save your strategies to your library or share them publicly in our marketplace for others to discover.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'pricing',
      title: 'Pricing',
      content: (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="card">
            <h4 className="text-xl font-bold text-text-primary mb-2">Free</h4>
            <p className="text-3xl font-bold text-primary-400 mb-4">$0<span className="text-sm text-text-muted">/month</span></p>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>✓ 10 strategies/month</li>
              <li>✓ Basic backtesting</li>
              <li>✓ Strategy library access</li>
            </ul>
            <Link to="/signup" className="block mt-6">
              <Button variant="secondary" className="w-full">Get Started</Button>
            </Link>
          </div>
          <div className="card border-2 border-primary-500 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-gradient-to-r from-primary-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">POPULAR</span>
            </div>
            <h4 className="text-xl font-bold text-text-primary mb-2">Pro</h4>
            <p className="text-3xl font-bold text-primary-400 mb-4">$49<span className="text-sm text-text-muted">/month</span></p>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>✓ Unlimited strategies</li>
              <li>✓ Advanced backtesting</li>
              <li>✓ Strategy comparison</li>
              <li>✓ Priority support</li>
            </ul>
            <Link to="/signup" className="block mt-6">
              <Button className="w-full">Get Started</Button>
            </Link>
          </div>
          <div className="card">
            <h4 className="text-xl font-bold text-text-primary mb-2">Enterprise</h4>
            <p className="text-3xl font-bold text-primary-400 mb-4">Custom</p>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>✓ Everything in Pro</li>
              <li>✓ Custom integrations</li>
              <li>✓ Dedicated support</li>
              <li>✓ On-premise deployment</li>
            </ul>
            <Link to="/signup" className="block mt-6">
              <Button variant="secondary" className="w-full">Contact Sales</Button>
            </Link>
          </div>
        </div>
      ),
    },
    {
      id: 'examples',
      title: 'Examples & Demos',
      content: (
        <div className="space-y-4">
          <p className="text-text-secondary mb-4">
            Explore example strategies to see what's possible:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-6 h-6 text-primary-400" />
                <h4 className="font-semibold text-text-primary">Moving Average Crossover</h4>
              </div>
              <p className="text-sm text-text-secondary">
                Classic trend-following strategy using SMA crossovers. Great for beginners.
              </p>
            </div>
            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <BarChart3 className="w-6 h-6 text-purple-400" />
                <h4 className="font-semibold text-text-primary">RSI Mean Reversion</h4>
              </div>
              <p className="text-sm text-text-secondary">
                Mean reversion strategy using RSI oversold/overbought signals.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/signup">
              <Button>Try Demo Strategies</Button>
            </Link>
          </div>
        </div>
      ),
    },
    {
      id: 'testimonials',
      title: 'Testimonials',
      content: (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-500"></div>
              <div>
                <p className="font-semibold text-text-primary">Alex Chen</p>
                <p className="text-xs text-text-muted">Quantitative Analyst</p>
              </div>
            </div>
            <p className="text-sm text-text-secondary italic">
              "This platform has revolutionized how I test trading ideas. The drag-and-drop builder makes it so easy to iterate quickly."
            </p>
          </div>
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500"></div>
              <div>
                <p className="font-semibold text-text-primary">Sarah Martinez</p>
                <p className="text-xs text-text-muted">Independent Trader</p>
              </div>
            </div>
            <p className="text-sm text-text-secondary italic">
              "The strategy comparison feature is a game-changer. I can now easily see which approach works best for my trading style."
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-purple-900/20 to-indigo-900/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6">
              <span className="text-gradient">Build Trading Strategies</span>
              <br />
              <span className="text-text-primary">With AI-Powered Tools</span>
            </h1>
            <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
              Create, test, and deploy trading strategies with our drag-and-drop builder. 
              From idea to portfolio-ready code in minutes.
            </p>
            <div className="flex gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg">Get Started</Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" size="lg">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Accordion Sections */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-text-primary mb-12">
          Everything You Need
        </h2>
        <Accordion items={features} allowMultiple={false} />
      </section>

      {/* Live Demo Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="card text-center">
          <Rocket className="w-16 h-16 mx-auto mb-4 text-primary-400" />
          <h2 className="text-3xl font-bold text-text-primary mb-4">Ready to Get Started?</h2>
          <p className="text-text-secondary mb-6 max-w-2xl mx-auto">
            Join thousands of traders and quants building better strategies with our platform.
          </p>
          <Link to="/signup">
            <Button size="lg">Try It Free</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-default mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-text-muted text-sm">
              © 2025 Trading Platform. All rights reserved.
            </p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="text-text-muted hover:text-primary-400 text-sm">Privacy</a>
              <a href="#" className="text-text-muted hover:text-primary-400 text-sm">Terms</a>
              <a href="#" className="text-text-muted hover:text-primary-400 text-sm">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

