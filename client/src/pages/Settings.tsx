import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { updateProfile, changePassword } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Assuming tabs exist or I use standard HTML
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Shield } from 'lucide-react';

const Settings = () => {
    const { user, setUser } = useAuthStore();
    const [profileName, setProfileName] = useState(user?.name || '');
    const [profileEmail, setProfileEmail] = useState(user?.email || '');

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const handleUpdateProfile = async () => {
        try {
            const updated = await updateProfile({ name: profileName, email: profileEmail });
            setUser({ ...user, ...updated.user }); // Merge update
            toast.success("Profile updated successfully");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update profile");
        }
    };

    const handleChangePassword = async () => {
        try {
            await changePassword({ oldPassword, newPassword });
            setOldPassword('');
            setNewPassword('');
            toast.success("Password changed successfully");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to change password");
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col space-y-2 pb-6 border-b border-border/40">
                <h1 className="text-3xl md:text-4xl font-bold font-heading bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Settings
                </h1>
                <p className="text-muted-foreground">Manage your account settings and preferences.</p>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="profile" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <User className="h-4 w-4" /> Profile
                    </TabsTrigger>
                    <TabsTrigger value="security" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Shield className="h-4 w-4" /> Security
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-4">
                    <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-sm">
                        <CardHeader>
                            <CardTitle>Profile</CardTitle>
                            <CardDescription>Update your personal information.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={profileName}
                                        onChange={(e) => setProfileName(e.target.value)}
                                        className="rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        value={profileEmail}
                                        onChange={(e) => setProfileEmail(e.target.value)}
                                        className="rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button onClick={handleUpdateProfile} className="rounded-xl px-8">Save Changes</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-4">
                    <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-sm">
                        <CardHeader>
                            <CardTitle>Password</CardTitle>
                            <CardDescription>Change your password securely.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="current">Current Password</Label>
                                    <Input
                                        id="current"
                                        type="password"
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        className="rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="new">New Password</Label>
                                    <Input
                                        id="new"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button onClick={handleChangePassword} className="rounded-xl px-8">Update Password</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Settings;
