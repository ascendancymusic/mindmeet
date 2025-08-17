"use client"

import type React from "react"
import { useState } from "react"
import {
  Brain,
  Zap,
  Users,
  Palette,
  Copy,
  ImageIcon,
  Music,
  Crown,
  Sparkles,
  Check,
  Star,
  Network,
  Settings,
  FileText,
  Download,
  Shield,
  Clock,
  Mic,
} from "lucide-react"

// Simple placeholder upgrade handler
const handleUpgradeClick = (tier: string) => {
  alert(`Upgrade to ${tier} coming soon!`)
}

interface FeatureCardProps {
  title: string
  description: string
  icon: React.ReactNode
  comingSoon?: boolean
  highlight?: boolean
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon,
  comingSoon = false,
  highlight = false,
}) => (
  <div
    className={`group relative rounded-2xl p-6 transition-all duration-300 shadow-lg backdrop-blur-sm ${
      highlight
        ? "bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-400/40 hover:border-blue-300/60 hover:shadow-blue-500/20"
        : "bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40 hover:border-blue-500/40 hover:shadow-blue-500/10"
    } hover:from-slate-700/60 hover:to-slate-800/60`}
  >
    <div className="flex items-start gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center border text-xl font-bold ${
          highlight
            ? "bg-gradient-to-br from-blue-400/30 to-purple-500/30 border-blue-300/40 text-blue-200"
            : "bg-gradient-to-br from-blue-500/20 to-purple-600/20 border-blue-400/30 text-blue-300"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
          {title}
          {comingSoon && (
            <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-full bg-gradient-to-r from-amber-500 to-pink-500 text-white tracking-wider shadow">
              Soon
            </span>
          )}
          {highlight && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
        </h3>
        <p className="mt-1 text-slate-300 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-br from-blue-500/5 to-purple-600/5" />
  </div>
)

interface PricingTierProps {
  name: string
  price: string
  description: string
  features: string[]
  highlighted?: boolean
  buttonText: string
  gradient: string
  icon: React.ReactNode
}

const PricingTier: React.FC<PricingTierProps> = ({
  name,
  price,
  description,
  features,
  highlighted = false,
  buttonText,
  gradient,
  icon,
}) => (
  <div
    className={`relative rounded-3xl p-8 transition-all duration-300 ${
      highlighted
        ? "bg-gradient-to-br from-blue-500/10 to-purple-600/10 border-2 border-blue-400/50 shadow-2xl shadow-blue-500/20 scale-105"
        : "bg-gradient-to-br from-slate-800/70 to-slate-900/70 border border-slate-700/50 hover:border-slate-600/60"
    } backdrop-blur-xl`}
  >
    {highlighted && (
      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
          Most Popular
        </div>
      </div>
    )}

    <div className="text-center mb-8">
      <div
        className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}
      >
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">{name}</h3>
      <p className="text-slate-400 text-sm mb-4">{description}</p>
      <div className="flex items-baseline justify-center gap-1">
        <span
          className={`text-4xl font-bold bg-gradient-to-r ${gradient.replace("from-", "from-").replace("to-", "to-")} bg-clip-text text-transparent`}
        >
          {price}
        </span>
        <span className="text-slate-400 font-medium">/month</span>
      </div>
    </div>

    <ul className="space-y-3 mb-8">
      {features.map((feature, index) => (
        <li key={index} className="flex items-start gap-3">
          <div
            className={`w-5 h-5 rounded-full bg-gradient-to-r ${gradient} flex items-center justify-center flex-shrink-0 mt-0.5`}
          >
            <Check className="w-3 h-3 text-white" />
          </div>
          <span className="text-slate-300 text-sm leading-relaxed">{feature}</span>
        </li>
      ))}
    </ul>

    <button
      onClick={() => handleUpgradeClick(name)}
      className={`w-full py-4 rounded-2xl font-semibold text-white transition-all duration-300 hover:scale-[1.02] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/40 ${
        highlighted
          ? `bg-gradient-to-r ${gradient} shadow-xl hover:shadow-2xl`
          : `bg-gradient-to-r ${gradient} shadow-lg hover:shadow-xl`
      }`}
    >
      {buttonText}
    </button>
  </div>
)

export const ProPage: React.FC = () => {
  const [isLoggedIn] = useState(false) // This would come from your auth system

  return (
    <div className="min-h-screen w-full py-12 md:py-16 px-4 md:px-8 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-40 -right-40 w-[55vw] h-[55vw] bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[55vw] h-[55vw] bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] bg-green-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto space-y-20">
        {/* Hero Section */}
        <section className="text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-600/20 border border-blue-400/30 text-blue-300 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Unlock the full potential of your mind maps
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent drop-shadow-sm">
              MindMeet Pro
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-xl md:text-2xl text-slate-300 leading-relaxed">
            Advanced AI capabilities, unlimited creativity, and powerful collaboration tools for professional mind
            mapping.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button
              onClick={() => handleUpgradeClick("Pro")}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 hover:from-blue-600 hover:via-purple-600 hover:to-green-600 text-white font-semibold text-lg tracking-tight shadow-xl shadow-blue-900/40 hover:shadow-blue-700/40 transition-all duration-300 hover:scale-[1.03] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/40"
            >
              Upgrade to Pro
            </button>
            {!isLoggedIn && (
              <button className="px-8 py-4 rounded-2xl border border-slate-600/60 text-slate-200 hover:text-white hover:border-slate-400/60 bg-slate-800/40 hover:bg-slate-700/50 font-semibold shadow-lg transition-all duration-300">
                Start Free Trial
              </button>
            )}
          </div>
        </section>

        {/* AI Features Section */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Enhanced AI Capabilities
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Supercharge your creativity with advanced AI features designed for professional use.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              title="Much Higher AI Chat Limits"
              description="Extended conversation limits for deeper, more comprehensive AI interactions without interruption."
              icon={<Brain className="w-6 h-6" />}
              highlight
            />
            <FeatureCard
              title="Much Higher AI Fill Limits"
              description="Generate extensive mind map content with significantly increased AI fill capabilities."
              icon={<Zap className="w-6 h-6" />}
              highlight
            />
            <FeatureCard
              title="Priority AI Processing"
              description="Skip the queue with priority access to AI features during peak usage times."
              icon={<Crown className="w-6 h-6" />}
            />
          </div>
        </section>

        {/* Node & Content Features */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                Unlimited Creative Freedom
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Break free from limits and create without boundaries.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              title="Unlimited Mind Maps"
              description="Create as many mind maps as you need. No more 20-50 limit - build your entire knowledge base."
              icon={<Network className="w-6 h-6" />}
              highlight
            />
            <FeatureCard
              title="Unlimited Image Nodes"
              description="Add unlimited images per mind map instead of the 5-10 free limit. Perfect for visual thinkers."
              icon={<ImageIcon className="w-6 h-6" />}
              highlight
            />
            <FeatureCard
              title="Unlimited Audio Nodes"
              description="Embed unlimited audio files and voice notes. Transform your mind maps into rich multimedia experiences."
              icon={<Mic className="w-6 h-6" />}
              highlight
            />
            <FeatureCard
              title="Longer Audio File Limits"
              description="Upload longer audio files without compression or quality loss for detailed recordings."
              icon={<Clock className="w-6 h-6" />}
            />
            <FeatureCard
              title="Extended Playlist Support"
              description="Create comprehensive playlists with more tracks and better organization features."
              icon={<Music className="w-6 h-6" />}
            />
            <FeatureCard
              title="Advanced Node Types"
              description="Access to premium node types and early access to experimental features."
              icon={<Sparkles className="w-6 h-6" />}
              comingSoon
            />
          </div>
        </section>

        {/* Customization Features */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Advanced Customization
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Make your mind maps truly yours with professional customization options.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              title="Profile Customizations"
              description="Personalize your profile with custom themes, avatars, and branding options."
              icon={<Users className="w-6 h-6" />}
            />
            <FeatureCard
              title="GIF Avatar Support"
              description="Use animated GIF avatars and custom bucket storage for your media assets."
              icon={<ImageIcon className="w-6 h-6" />}
            />
            <FeatureCard
              title="Colored Gradient Username"
              description="Stand out with custom gradient colors for your username and display name."
              icon={<Palette className="w-6 h-6" />}
            />
            <FeatureCard
              title="Pro Icon Badge"
              description="Display your Pro status with exclusive badges and visual indicators."
              icon={<Crown className="w-6 h-6" />}
            />
            <FeatureCard
              title="Mind Map Customization"
              description="Advanced styling options for nodes, connections, and overall mind map appearance."
              icon={<Settings className="w-6 h-6" />}
            />
            <FeatureCard
              title="Node Customizations"
              description="Fine-tune individual node appearance with custom colors, shapes, and styling."
              icon={<Palette className="w-6 h-6" />}
            />
            <FeatureCard
              title="Custom Background Images"
              description="Set custom background images for your mind maps to match your style or brand."
              icon={<ImageIcon className="w-6 h-6" />}
            />
            <FeatureCard
              title="Export & Sharing Options"
              description="Advanced export formats and sharing controls for professional presentations."
              icon={<Download className="w-6 h-6" />}
            />
          </div>
        </section>

        {/* Other Pro Features */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                Professional Tools
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Essential features for professional mind mapping and collaboration.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              title="Clone Your Mind Maps"
              description="Duplicate and template your best mind maps for rapid iteration and sharing."
              icon={<Copy className="w-6 h-6" />}
              highlight
            />
            <FeatureCard
              title="Version History"
              description="Track changes and restore previous versions of your mind maps with detailed history."
              icon={<Clock className="w-6 h-6" />}
            />
            <FeatureCard
              title="Advanced Collaboration"
              description="Real-time collaboration with role-based permissions and team management features."
              icon={<Users className="w-6 h-6" />}
            />
            <FeatureCard
              title="Priority Support"
              description="Get faster response times and dedicated support for your Pro account questions."
              icon={<Shield className="w-6 h-6" />}
            />
            <FeatureCard
              title="API Access"
              description="Integrate mind maps with your existing tools and workflows through our API."
              icon={<Network className="w-6 h-6" />}
              comingSoon
            />
            <FeatureCard
              title="Advanced Analytics"
              description="Detailed insights into your mind mapping patterns and collaboration metrics."
              icon={<FileText className="w-6 h-6" />}
              comingSoon
            />
          </div>
        </section>

        {/* Pricing Section */}
        <section className="space-y-12">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Choose Your Pro Plan</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Flexible pricing options designed to scale with your needs.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Plus Tier */}
            <PricingTier
              name="Plus"
              price="€5"
              description="Perfect for individual creators"
              gradient="from-blue-500 to-blue-600"
              icon={<Network className="w-8 h-8 text-white" />}
              buttonText="Start Plus"
              features={[
                "Unlimited mind maps",
                "Unlimited image nodes",
                "Unlimited audio nodes",
                "Clone mind maps",
                "Profile customizations",
                "GIF avatar support",
                "Colored gradient username",
                "Pro icon badge",
              ]}
            />

            {/* Elite Tier */}
            <PricingTier
              name="Elite"
              price="€15"
              description="For power users and teams"
              gradient="from-purple-500 to-blue-600"
              icon={<Crown className="w-8 h-8 text-white" />}
              buttonText="Start Elite"
              highlighted
              features={[
                "Everything in Plus",
                "Much higher AI chat limits",
                "Much higher AI fill limits",
                "Priority AI processing",
                "Advanced mind map customization",
                "Custom background images",
                "Priority support",
                "Early access to new features",
                "Advanced export options",
              ]}
            />

            {/* Enterprise Tier */}
            <PricingTier
              name="Enterprise"
              price="Custom"
              description="For organizations and teams"
              gradient="from-green-500 to-blue-600"
              icon={<Shield className="w-8 h-8 text-white" />}
              buttonText="Contact Sales"
              features={[
                "Everything in Elite",
                "API access",
                "Advanced analytics",
                "Team management",
                "SSO integration",
                "Custom branding",
                "Dedicated support",
                "SLA guarantees",
                "Custom integrations",
              ]}
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center space-y-8 py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to unlock your full potential?</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
            Join thousands of professionals who have transformed their thinking with MindMeet Pro.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => handleUpgradeClick("Pro")}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 hover:from-blue-600 hover:via-purple-600 hover:to-green-600 text-white font-semibold text-lg tracking-tight shadow-xl shadow-blue-900/40 hover:shadow-blue-700/40 transition-all duration-300 hover:scale-[1.03] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/40"
            >
              Start Your Pro Journey
            </button>
            <button className="px-8 py-4 rounded-2xl border border-slate-600/60 text-slate-200 hover:text-white hover:border-slate-400/60 bg-slate-800/40 hover:bg-slate-700/50 font-semibold shadow-lg transition-all duration-300">
              View Feature Comparison
            </button>
          </div>

          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium pt-4">
            30-day money-back guarantee • Cancel anytime • No setup fees
          </p>
        </section>
      </div>
    </div>
  )
}
