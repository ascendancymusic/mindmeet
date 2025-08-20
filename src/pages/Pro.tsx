"use client"

import type React from "react"
import { useState } from "react"
import {
  Check,
  Crown,
  Zap,
  Star,
  Users,
  Brain,
  Network,
  ImageIcon,
  Music,
  Palette,
  Copy,
  Shield,
  Sparkles,
  X,
} from "lucide-react"

interface PricingFeature {
  name: string
  included: boolean
  highlight?: boolean
  description?: string
}

interface PricingTier {
  name: string
  price: string
  period: string
  description: string
  features: PricingFeature[]
  popular?: boolean
  gradient: string
  icon: React.ReactNode
  buttonText: string
  buttonAction: () => void
}

const PricingPage: React.FC = () => {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly")

  const handleUpgrade = (tierName: string) => {
    alert(`Upgrading to ${tierName} - Integration with payment system coming soon!`)
  }

  const tiers: PricingTier[] = [
    {
      name: "Free",
      price: "€0",
      period: billingPeriod === "monthly" ? "/month" : "/year",
      description: "Perfect for getting started with mind mapping",
      gradient: "from-slate-600 to-slate-700",
      icon: <Network className="w-6 h-6 text-white" />,
      buttonText: "Get Started",
      buttonAction: () => handleUpgrade("Free"),
      features: [
        { name: "Up to 20-50 mind maps", included: true },
        { name: "5-10 image nodes per map", included: true },
        { name: "5-10 audio nodes per map", included: true },
        { name: "Basic AI chat (limited)", included: true },
        { name: "Basic AI fill (limited)", included: true },
        { name: "Standard connection styles", included: true },
        { name: "Basic customization", included: true },
        { name: "Community support", included: true },
        { name: "Clone mind maps", included: false },
        { name: "Unlimited mind maps", included: false },
        { name: "Priority AI processing", included: false },
        { name: "Advanced customization", included: false },
        { name: "Profile customization", included: false },
        { name: "Priority support", included: false },
      ],
    },
    {
      name: "Plus",
      price: billingPeriod === "monthly" ? "€5" : "€50",
      period: billingPeriod === "monthly" ? "/month" : "/year",
      description: "Enhanced features for serious mind mappers",
      gradient: "from-blue-500 to-blue-600",
      icon: <Zap className="w-6 h-6 text-white" />,
      buttonText: "Upgrade to Plus",
      buttonAction: () => handleUpgrade("Plus"),
      features: [
        { name: "Unlimited mind maps", included: true, highlight: true },
        { name: "Unlimited image nodes", included: true, highlight: true },
        { name: "Unlimited audio nodes", included: true, highlight: true },
        { name: "Clone mind maps", included: true, highlight: true },
        { name: "Profile customization", included: true, highlight: true },
        { name: "GIF avatar support", included: true },
        { name: "Colored gradient username", included: true },
        { name: "Pro icon badge", included: true },
        { name: "Longer audio file limits", included: true },
        { name: "Extended playlist support", included: true },
        { name: "Basic AI chat (limited)", included: true },
        { name: "Basic AI fill (limited)", included: true },
        { name: "Priority AI processing", included: false },
        { name: "Advanced AI features", included: false },
        { name: "Priority support", included: false },
      ],
    },
    {
      name: "Elite",
      price: billingPeriod === "monthly" ? "€15" : "€150",
      period: billingPeriod === "monthly" ? "/year" : "/year",
      description: "Ultimate mind mapping with AI superpowers",
      gradient: "from-purple-500 to-blue-600",
      icon: <Crown className="w-6 h-6 text-white" />,
      buttonText: "Upgrade to Elite",
      buttonAction: () => handleUpgrade("Elite"),
      popular: true,
      features: [
        { name: "Everything in Plus", included: true },
        { name: "Much higher AI chat limits", included: true, highlight: true },
        { name: "Much higher AI fill limits", included: true, highlight: true },
        { name: "Priority AI processing", included: true, highlight: true },
        { name: "Advanced mind map customization", included: true, highlight: true },
        { name: "Node customizations", included: true },
        { name: "Custom background images", included: true },
        { name: "Advanced export options", included: true },
        { name: "Priority support", included: true },
        { name: "Early access to features", included: true },
        { name: "API access", included: true, description: "Coming soon" },
        { name: "Team collaboration", included: true, description: "Coming soon" },
        { name: "Advanced analytics", included: true, description: "Coming soon" },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-purple-900 p-4 md:p-8">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute -top-40 -right-40 w-[55vw] h-[55vw] bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[55vw] h-[55vw] bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-600/20 border border-blue-400/30 text-blue-300 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Choose your perfect plan
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
              Simple, Transparent Pricing
            </span>
          </h1>

          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8 leading-relaxed">
            Unlock the full potential of your mind mapping with features designed for every level of creativity and
            collaboration.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center p-1 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                billingPeriod === "monthly"
                  ? "bg-gradient-to-r from-blue-500/80 to-purple-600/80 text-white shadow-lg"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("yearly")}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 relative ${
                billingPeriod === "yearly"
                  ? "bg-gradient-to-r from-blue-500/80 to-purple-600/80 text-white shadow-lg"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {tiers.map((tier, index) => (
            <div
              key={tier.name}
              className={`relative rounded-3xl p-8 transition-all duration-500 hover:-translate-y-2 ${
                tier.popular
                  ? "bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-2 border-blue-400/50 shadow-2xl shadow-blue-500/20 scale-105"
                  : "bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-white/10 hover:border-white/20 shadow-xl"
              } backdrop-blur-xl`}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-bold px-6 py-2 rounded-full shadow-lg flex items-center gap-2">
                    <Star className="w-4 h-4 fill-current" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="text-center mb-8">
                <div
                  className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${tier.gradient} flex items-center justify-center shadow-lg`}
                >
                  {tier.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                <p className="text-slate-400 text-sm mb-6">{tier.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span
                    className={`text-5xl font-bold bg-gradient-to-r ${tier.gradient} bg-clip-text text-transparent`}
                  >
                    {tier.price}
                  </span>
                  <span className="text-slate-400 font-medium">{tier.period}</span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-4 mb-8">
                {tier.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {feature.included ? (
                        <div
                          className={`w-5 h-5 rounded-full bg-gradient-to-r ${
                            feature.highlight ? "from-green-400 to-emerald-500" : tier.gradient
                          } flex items-center justify-center shadow-lg`}
                        >
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-600/50 flex items-center justify-center">
                          <X className="w-3 h-3 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <span
                        className={`text-sm ${
                          feature.included
                            ? feature.highlight
                              ? "text-white font-medium"
                              : "text-slate-300"
                            : "text-slate-500"
                        }`}
                      >
                        {feature.name}
                      </span>
                      {feature.description && (
                        <span className="ml-2 text-xs text-blue-400 font-medium">({feature.description})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button
                onClick={tier.buttonAction}
                className={`w-full py-4 rounded-2xl font-semibold text-white transition-all duration-300 hover:scale-[1.02] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/40 ${
                  tier.popular
                    ? `bg-gradient-to-r ${tier.gradient} shadow-xl hover:shadow-2xl`
                    : tier.name === "Free"
                      ? "bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30"
                      : `bg-gradient-to-r ${tier.gradient} shadow-lg hover:shadow-xl`
                }`}
              >
                {tier.buttonText}
              </button>
            </div>
          ))}
        </div>

        {/* Feature Comparison */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-3xl p-8 border border-white/10 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Feature Comparison
              </span>
            </h2>
            <p className="text-slate-400">See exactly what's included in each plan</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* AI Features */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full"></div>
                <h4 className="font-semibold text-white">AI Features</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-blue-400" />
                  <span className="text-slate-300">Higher AI chat limits</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span className="text-slate-300">Higher AI fill limits</span>
                </div>
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  <span className="text-slate-300">Priority processing</span>
                </div>
              </div>
            </div>

            {/* Content Features */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-green-400 to-blue-400 rounded-full"></div>
                <h4 className="font-semibold text-white">Content</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-green-400" />
                  <span className="text-slate-300">Unlimited mind maps</span>
                </div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-400" />
                  <span className="text-slate-300">Unlimited images</span>
                </div>
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-purple-400" />
                  <span className="text-slate-300">Unlimited audio</span>
                </div>
              </div>
            </div>

            {/* Customization */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full"></div>
                <h4 className="font-semibold text-white">Customization</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-purple-400" />
                  <span className="text-slate-300">Profile customization</span>
                </div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-pink-400" />
                  <span className="text-slate-300">Custom backgrounds</span>
                </div>
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  <span className="text-slate-300">Pro badges</span>
                </div>
              </div>
            </div>

            {/* Professional */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-orange-400 to-red-400 rounded-full"></div>
                <h4 className="font-semibold text-white">Professional</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Copy className="w-4 h-4 text-orange-400" />
                  <span className="text-slate-300">Clone mind maps</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-slate-300">Priority support</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-slate-300">Team features</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Frequently Asked Questions
            </span>
          </h2>
          <p className="text-slate-400 mb-8">Everything you need to know about our pricing</p>

          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h4 className="font-semibold text-white mb-2">Can I change plans anytime?</h4>
              <p className="text-slate-300 text-sm">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h4 className="font-semibold text-white mb-2">What happens to my data if I downgrade?</h4>
              <p className="text-slate-300 text-sm">
                Your data is always safe. If you exceed limits, you'll just need to upgrade again to access everything.
              </p>
            </div>
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h4 className="font-semibold text-white mb-2">Is there a free trial?</h4>
              <p className="text-slate-300 text-sm">
                Yes! Start with our free plan and upgrade when you're ready for more advanced features.
              </p>
            </div>
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h4 className="font-semibold text-white mb-2">Do you offer refunds?</h4>
              <p className="text-slate-300 text-sm">
                We offer a 30-day money-back guarantee for all paid plans. No questions asked.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PricingPage
