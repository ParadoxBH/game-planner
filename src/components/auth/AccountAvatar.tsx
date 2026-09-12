import { Avatar } from "@mui/material";

interface AccountAvatarProps {
  name: string;
  size?: number;
}

/** Inicial do nome sobre a cor de destaque do tema. */
export function AccountAvatar({ name, size = 32 }: AccountAvatarProps) {
  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        bgcolor: "primary.main",
        color: "primary.contrastText",
        fontSize: size * 0.45,
        fontWeight: 700,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </Avatar>
  );
}
