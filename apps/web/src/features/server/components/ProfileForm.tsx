import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { useCreateProfile } from '../api/queries';

export const ProfileForm = () => {
  const { t: translate } = useTranslation();
  const createProfile = useCreateProfile();
  const [name, setName] = useState('');
  const id = useId();

  return (
    <form
      className="flex flex-col items-center gap-[0.6cqw] text-[1cqw]"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim()) createProfile.mutate(name.trim());
      }}
    >
      <p className="max-w-[32cqw] text-center">{translate('server.profileHint')}</p>
      <label htmlFor={id} className="flex items-center gap-[0.5cqw]">
        {translate('server.profileName')}
        <input
          id={id}
          value={name}
          maxLength={40}
          onChange={(event) => setName(event.target.value)}
          className="rounded border border-gold/40 bg-ink-soft px-[0.5cqw] py-[0.2cqw]"
        />
      </label>
      <Button type="submit" disabled={!name.trim() || createProfile.isPending}>
        {translate('server.createProfile')}
      </Button>
      {createProfile.isError && (
        <p role="alert" className="text-red-300">
          {translate('server.error')}
        </p>
      )}
    </form>
  );
};
