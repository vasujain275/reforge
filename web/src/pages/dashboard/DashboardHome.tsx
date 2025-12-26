import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { Activity, CheckCircle2, Plus, RotateCw, Trophy } from "lucide-react";

export default function DashboardHome() {
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-400 inline-block">
             Command Center
          </h2>
          <p className="text-muted-foreground mt-1">
             Welcome back, <span className="font-medium text-foreground">{user?.name}</span>. Your memory forge is active.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button size="lg" className="rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
            <Plus className="mr-2 h-4 w-4" />
            Initialize Session
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
            title="Total Solved"
            value="0"
            footer="+0 from last month"
            icon={<CheckCircle2 className="h-4 w-4 text-primary" />}
        />
        <StatsCard
            title="Current Streak"
            value="0 Days"
            footer="Keep the forge burning"
            icon={<Activity className="h-4 w-4 text-orange-500" />}
        />
        <StatsCard
            title="Pending Reviews"
            value="0"
            footer="Items due for revision"
            icon={<RotateCw className="h-4 w-4 text-blue-500" />}
        />
        <StatsCard
            title="Mastery Score"
            value="0%"
            footer="Confidence Index"
            icon={<Trophy className="h-4 w-4 text-yellow-500" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-none shadow-md bg-card/40 backdrop-blur-sm">
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center h-48 border-2 border-dashed border-muted rounded-lg text-muted-foreground">
                    No recent activity logs found.
                </div>
            </CardContent>
        </Card>
         <Card className="col-span-3 border-none shadow-md bg-gradient-to-br from-card/40 to-primary/5 backdrop-blur-sm">
            <CardHeader>
                <CardTitle>Quick Protocols</CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start h-12 text-md hover:bg-primary/10 hover:text-primary transition-colors border-primary/20">
                        ⚡ Daily Revision (35 min)
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-12 text-md hover:bg-orange-500/10 hover:text-orange-500 transition-colors border-orange-500/20">
                         🔥 Weakness Attack
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-12 text-md hover:bg-blue-500/10 hover:text-blue-500 transition-colors border-blue-500/20">
                         🧬 Pattern Deep Dive
                    </Button>
                 </div>
            </CardContent>
        </Card>
      </div>

    </div>
  );
}

function StatsCard({ title, value, footer, icon }: { title: string; value: string; footer: string; icon: React.ReactNode }) {
    return (
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            {icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground mt-1">{footer}</p>
          </CardContent>
        </Card>
    )
}
