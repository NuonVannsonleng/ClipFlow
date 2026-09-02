'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { AudioLines, CircleAlert, Film, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PlatformIcon } from '@/components/PlatformIcon';
import { Badge, Card } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { PLATFORMS as LOCAL_PLATFORMS } from '@/lib/platforms';
import type { Capabilities, PlatformDescriptor } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * The grid renders the server's registry when it can reach the API, so what
 * the marketing page claims always matches what the backend will attempt.
 */
export function PlatformGrid({ limit, className }: { limit?: number; className?: string }) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const [platforms, setPlatforms] = useState<PlatformDescriptor[]>(LOCAL_PLATFORMS);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .platforms()
      .then((response) => {
        if (cancelled) return;
        setPlatforms(response.platforms);
        setCapabilities(response.capabilities);
      })
      .catch(() => {
        /* keep the mirrored local list */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = limit ? platforms.slice(0, limit) : platforms;
  const unavailable = capabilities?.provider === 'unavailable';

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {visible.map((platform, index) => (
        <motion.div
          key={platform.id}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4, delay: Math.min(index * 0.035, 0.28), ease: [0.22, 1, 0.36, 1] }}
        >
          <Card spotlight className="flex h-full flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <PlatformIcon platform={platform.id} size="md" />
                <h3 className="text-[0.9375rem] font-semibold tracking-tight">{platform.name}</h3>
              </div>
              <Badge
                tone={unavailable ? 'neutral' : platform.status === 'supported' ? 'success' : 'warning'}
                icon={platform.status === 'limited' ? <CircleAlert /> : undefined}
              >
                {unavailable
                  ? t('platforms.unavailable')
                  : platform.status === 'supported'
                    ? t('platforms.supported')
                    : t('platforms.limited')}
              </Badge>
            </div>

            <ul className="flex flex-wrap gap-1.5">
              {platform.capabilities.includes('video') && (
                <li>
                  <Badge tone="neutral" icon={<Film />}>
                    {t('platforms.video')}
                  </Badge>
                </li>
              )}
              {platform.capabilities.includes('audio') && (
                <li>
                  <Badge tone="neutral" icon={<AudioLines />}>
                    {t('platforms.audio')}
                  </Badge>
                </li>
              )}
              {platform.capabilities.includes('public-only') && (
                <li>
                  <Badge tone="neutral" icon={<Lock />}>
                    {t('platforms.publicOnly')}
                  </Badge>
                </li>
              )}
            </ul>

            {platform.note && (
              <p className="mt-auto text-xs leading-relaxed text-subtle">{platform.note}</p>
            )}
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
