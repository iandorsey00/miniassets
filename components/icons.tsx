import type { LucideProps } from "lucide-react";
import {
  ArrowRightLeft,
  Boxes,
  Download,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Settings,
  QrCode,
  Save,
  Search,
  SquarePen,
} from "lucide-react";

type IconProps = {
  className?: string;
};

type IconComponent = (props: LucideProps) => React.ReactNode;

function IconBase({ className, icon: Icon }: IconProps & { icon: IconComponent }) {
  return (
    <span className={className} aria-hidden="true">
      <Icon strokeWidth={1.85} />
    </span>
  );
}

export function DashboardIcon({ className }: IconProps) {
  return <IconBase className={className} icon={LayoutDashboard} />;
}

export function AssetIcon({ className }: IconProps) {
  return <IconBase className={className} icon={Boxes} />;
}

export function LocationIcon({ className }: IconProps) {
  return <IconBase className={className} icon={FolderTree} />;
}

export function ExportIcon({ className }: IconProps) {
  return <IconBase className={className} icon={Download} />;
}

export function LogoutIcon({ className }: IconProps) {
  return <IconBase className={className} icon={LogOut} />;
}

export function SwitchIcon({ className }: IconProps) {
  return <IconBase className={className} icon={ArrowRightLeft} />;
}

export function SearchIcon({ className }: IconProps) {
  return <IconBase className={className} icon={Search} />;
}

export function SaveIcon({ className }: IconProps) {
  return <IconBase className={className} icon={Save} />;
}

export function PencilIcon({ className }: IconProps) {
  return <IconBase className={className} icon={SquarePen} />;
}

export function BarcodeIcon({ className }: IconProps) {
  return <IconBase className={className} icon={QrCode} />;
}

export function SettingsIcon({ className }: IconProps) {
  return <IconBase className={className} icon={Settings} />;
}
