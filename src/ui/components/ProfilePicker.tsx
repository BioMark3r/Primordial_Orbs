import type { Profile, ProfileId } from "../../profile/types";
import { GUEST_ID } from "../../profile/types";

type ProfilePickerProps = {
  label: string;
  profiles: Profile[];
  value: ProfileId;
  onChange: (profileId: ProfileId) => void;
  className?: string;
};

export function ProfilePicker({ label, profiles, value, onChange, className }: ProfilePickerProps) {
  return (
    <label className={className} style={{ display: "grid", gap: 6 }}>
      <span style={{ fontWeight: 700 }}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{ width: "100%", padding: 10, borderRadius: 10 }}
      >
        <option value={GUEST_ID}>Guest</option>
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.name}
          </option>
        ))}
      </select>
    </label>
  );
}
