import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/profile/identities";

export function ProfileAvatar({
    src,
    fullName,
    email,
    size = "lg",
}: {
    src: string | null;
    fullName: string | null;
    email: string;
    size?: "default" | "sm" | "lg";
}) {
    return (
        <Avatar size={size}>
            {src && <AvatarImage src={src} alt="" />}
            <AvatarFallback>{initials(fullName, email)}</AvatarFallback>
        </Avatar>
    );
}
