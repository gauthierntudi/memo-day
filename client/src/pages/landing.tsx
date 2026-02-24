import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  HardHat,
  ClipboardCheck,
  BarChart3,
  Shield,
  Users,
  CalendarDays,
  FileText,
  TrendingUp,
  Building2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">MEM - DAY ON SITE</h1>
              <p className="text-[11px] text-muted-foreground leading-tight">Construction Daily Report System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button onClick={onGetStarted} data-testid="button-landing-login">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              <HardHat className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h2 className="text-4xl font-bold tracking-tight mb-4" data-testid="heading-hero">
            Construction Site Reporting, Simplified
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            A comprehensive platform for collecting, managing, and analyzing daily construction reports across multiple work sites. Track activities, labour, safety, equipment, materials, and generate insightful weekly reports — all in one place.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" onClick={onGetStarted} data-testid="button-hero-get-started">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-3" data-testid="heading-features">Key Features</h3>
          <p className="text-muted-foreground text-center mb-10 max-w-xl mx-auto">
            Everything your construction team needs to stay organized, compliant, and productive.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: ClipboardCheck,
                title: "Daily Reports",
                desc: "Capture comprehensive daily site data: weather, work activities by trade, labour counts, subcontractors, safety and security incidents, equipment usage, materials, and inventory.",
              },
              {
                icon: CalendarDays,
                title: "Weekly Plans",
                desc: "Create detailed weekly plans with target activities, labour forecasts, subcontractor schedules, productivity metrics, and project milestones.",
              },
              {
                icon: BarChart3,
                title: "Weekly Reports",
                desc: "Auto-generated weekly reports comparing actual daily progress against planned targets, with visual charts for easy analysis.",
              },
              {
                icon: TrendingUp,
                title: "Executive Summaries",
                desc: "Aggregated views across weekly, monthly, and quarterly periods with trend charts and PDF export for stakeholder presentations.",
              },
              {
                icon: Shield,
                title: "Safety & Security",
                desc: "Record safety incidents with severity levels and corrective actions. Track security events and maintain a full audit trail with photo uploads.",
              },
              {
                icon: Users,
                title: "Role-Based Access",
                desc: "Dynamic permissions system with 17 organization roles controlling who can create, edit, submit, approve, or view reports and plans.",
              },
            ].map((feature, i) => (
              <Card key={i} className="border bg-card">
                <CardContent className="pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h4 className="font-semibold mb-2">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-3" data-testid="heading-how-it-works">How It Works</h3>
          <p className="text-muted-foreground text-center mb-10 max-w-xl mx-auto">
            A straightforward workflow from daily data collection to management-level insights.
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Collect", desc: "Site engineers fill in daily reports capturing all site activities, labour, safety, equipment, and materials." },
              { step: "2", title: "Submit & Approve", desc: "Reports follow an approval workflow — draft, submitted, then approved or returned with feedback." },
              { step: "3", title: "Analyze", desc: "Weekly reports are auto-generated comparing actual progress against weekly plans with visual charts." },
              { step: "4", title: "Report", desc: "Executive summaries aggregate data across periods for management review and decision-making." },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg mx-auto mb-4">
                  {item.step}
                </div>
                <h4 className="font-semibold mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-3" data-testid="heading-what-you-can-track">What You Can Track</h3>
          <p className="text-muted-foreground text-center mb-10 max-w-xl mx-auto">
            Every aspect of your construction site, captured in a structured daily report.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              "Weather conditions and impact on work",
              "Work activities per trade with progress tracking",
              "Labour force counts and hours by trade",
              "Subcontractor presence and work descriptions",
              "Safety incidents with severity and corrective actions",
              "Security events and access control",
              "Housekeeping and site cleanliness status",
              "Equipment usage, status, and operator details",
              "Materials received and consumed",
              "Inventory levels with opening/closing balances",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-3" data-testid="heading-about-us">About Us</h3>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">MEM - DAY ON SITE</strong> is developed by MEM, a construction and development company committed to operational excellence across its projects. With operations spanning multiple sites and jurisdictions, MEM recognized the need for a centralized, digital solution to replace fragmented paper-based reporting and bring structure, accountability, and data-driven insight to daily site management.
            </p>
            <p>
              This platform was built from the ground up to address the real challenges faced by construction teams every day — from site engineers documenting daily progress to project managers reviewing submissions, and executive leadership tracking performance across the portfolio.
            </p>
            <p>
              Our mission is to empower construction professionals with tools that make reporting effortless, approvals transparent, and performance analysis automatic. By digitizing the daily reporting workflow, we help teams reduce administrative overhead, improve safety compliance, and make better-informed decisions at every level of the organization.
            </p>
            <p>
              Whether you manage a single project or a portfolio of sites, MEM - DAY ON SITE provides the visibility and control you need to keep your projects on track.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-primary/5">
        <div className="max-w-3xl mx-auto text-center">
          <FileText className="h-10 w-10 text-primary mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-3">Ready to streamline your site reporting?</h3>
          <p className="text-muted-foreground mb-6">
            Sign in to start capturing daily reports, or create an account to join your team.
          </p>
          <Button size="lg" onClick={onGetStarted} data-testid="button-cta-get-started">
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      <footer className="border-t py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>MEM - DAY ON SITE v1.0</span>
          </div>
          <p>&copy; {new Date().getFullYear()} MEM. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
