import { FC } from 'react';
import { SectionProps } from '../UnifiedSettings';
import styles from './HandsfreeSettings.module.css';

const isMediaRecorderSupported =
  typeof window !== 'undefined' &&
  typeof MediaRecorder !== 'undefined' &&
  typeof navigator.mediaDevices?.getUserMedia === 'function';

const HandsfreeSettings: FC<SectionProps> = ({ settings, onChange }) => {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Handsfree Mode</h3>

      <div className={styles.description}>
        The app plays a card&apos;s audio, you speak the answer back. Your pronunciation is compared
        against the reference recording.
      </div>

      <label className={styles.checkboxRow}>
        <div className={styles.checkboxContainer}>
          <input
            type="checkbox"
            checked={settings.handsfreeMode === true}
            onChange={e => onChange('handsfreeMode', e.target.checked)}
            disabled={!isMediaRecorderSupported}
            className={styles.checkbox}
          />
          <span className={styles.checkboxLabel}>
            Enable handsfree mode
          </span>
        </div>
      </label>

      {!isMediaRecorderSupported && (
        <div className={styles.warningBox}>
          Not supported in this browser. Requires microphone access via MediaRecorder API.
        </div>
      )}

      {settings.handsfreeMode && isMediaRecorderSupported && (
        <>
          <label className={styles.checkboxRow}>
            <div className={styles.checkboxContainer}>
              <input
                type="checkbox"
                checked={settings.handsfreePlaybackOnIncorrect !== false}
                onChange={e => onChange('handsfreePlaybackOnIncorrect', e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.checkboxLabel}>
                Play correct audio on incorrect answer
              </span>
            </div>
          </label>

          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>Retries after incorrect</span>
            <select
              value={settings.handsfreeRetries ?? 1}
              onChange={e => onChange('handsfreeRetries', parseInt(e.target.value))}
              className={styles.select}
            >
              <option value={0}>No retries</option>
              <option value={1}>1 retry</option>
              <option value={2}>2 retries</option>
              <option value={3}>3 retries</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
};

export default HandsfreeSettings;
