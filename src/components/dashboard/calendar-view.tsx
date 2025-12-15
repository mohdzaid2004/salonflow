import { appointments, customers, services, staff } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function CalendarView() {
  const todayAppointments = appointments
    .filter(
      (appt) =>
        new Date(appt.dateTime).toDateString() === new Date().toDateString()
    )
    .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

  const getAppointmentDetails = (appt: typeof appointments[0]) => {
    const customer = customers.find((c) => c.id === appt.customerId);
    const staffMember = staff.find((s) => s.id === appt.staffId);
    const apptServices = services.filter((s) => appt.serviceIds.includes(s.id));
    return { customer, staffMember, apptServices };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Appointments</CardTitle>
        <CardDescription>{format(new Date(), 'eeee, MMMM do')}</CardDescription>
      </CardHeader>
      <CardContent>
        {todayAppointments.length > 0 ? (
          <div className="space-y-4">
            {todayAppointments.map((appt) => {
              const { customer, staffMember, apptServices } = getAppointmentDetails(appt);
              const totalDuration = apptServices.reduce((acc, s) => acc + s.duration, 0);
              const endTime = new Date(appt.dateTime.getTime() + totalDuration * 60000);

              return (
                <div key={appt.id} className="flex gap-4">
                  <div className="w-20 text-right text-sm text-muted-foreground">
                    <p>{format(appt.dateTime, 'h:mm a')}</p>
                    <p className="text-xs">
                        {format(endTime, 'h:mm a')}
                    </p>
                  </div>
                  <div className="relative w-full">
                    <div className="absolute left-0 top-1 h-full w-0.5 bg-border"></div>
                     <Card className={cn("ml-4", {
                        'bg-accent': appt.status === 'booked',
                        'bg-secondary': appt.status === 'completed',
                     })}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{customer?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              with {staffMember?.name}
                            </p>
                          </div>
                           <Badge variant={appt.status === 'completed' ? 'secondary' : 'default'} className="capitalize">{appt.status}</Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {apptServices.map(s => (
                            <Badge key={s.id} variant="outline">{s.name}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-20 text-center">
            <h3 className="text-lg font-semibold text-muted-foreground">No appointments today</h3>
            <p className="text-sm text-muted-foreground/80">
              Click &quot;New Appointment&quot; to book one.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
