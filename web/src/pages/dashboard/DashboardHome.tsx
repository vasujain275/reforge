import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";
import { Activity, CreditCard, DollarSign, Users } from "lucide-react";

export default function DashboardHome() {
  const { user } = useAuthStore();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
            Welcome back, {user?.name || "Engineer"}
        </h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => alert("Not implemented yet")}>Download Report</Button>
        </div>
      </div>

      {/* Quick Actions / System Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,231.89</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+2350</div>
            <p className="text-xs text-muted-foreground">+180.1% from last month</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12,234</div>
            <p className="text-xs text-muted-foreground">+19% from last month</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+573</div>
            <p className="text-xs text-muted-foreground">+201 since last hour</p>
          </CardContent>
        </Card>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4 hover:border-primary/30 transition-colors">
                  <CardHeader>
                    <CardTitle>Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="pl-2">
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground border border-dashed rounded-md bg-muted/20">
                        Chart Placeholder
                    </div>
                  </CardContent>
            </Card>
            <Card className="col-span-3 hover:border-primary/30 transition-colors">
                  <CardHeader>
                    <CardTitle>Recent Sales</CardTitle>
                    <CardDescription>
                      You made 265 sales this month.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-4">
                        <div className="flex items-center">
                            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">JD</div>
                            <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">Jackson Lee</p>
                                <p className="text-sm text-muted-foreground">jackson.lee@email.com</p>
                            </div>
                            <div className="ml-auto font-medium">+$39.00</div>
                        </div>
                        <div className="flex items-center">
                            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">IL</div>
                            <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">Isabella Nguyen</p>
                                <p className="text-sm text-muted-foreground">isabella.nguyen@email.com</p>
                            </div>
                            <div className="ml-auto font-medium">+$299.00</div>
                        </div>
                     </div>
                  </CardContent>
            </Card>
       </div>
    </div>
  );
}
