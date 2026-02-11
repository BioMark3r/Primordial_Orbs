import type { Profile, ProfileId } from "../../profile/types";

type ProfilePickerProps = {
  label: string;
  profiles: Profile[];
  value: ProfileId | null;
  onChange: (profileId: ProfileId | null) => void;
  allowNone?: boolean;
};

export function ProfilePicker({ label, profiles, value, onChange, allowNone = false }: ProfilePickerProps) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontWeight: 700 }}>{label}</span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        style={{ width: "100%", padding: 10, borderRadius: 10 }}
      >
        {allowNone && <option value="">Select profile</option>}
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.name}
          </option>
        ))}
      </select>
    </label>
  );
}
