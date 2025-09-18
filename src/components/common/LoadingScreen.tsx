import { FC } from 'react';
import styles from './LoadingScreen.module.css';

const LoadingScreen: FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.spinner}>
        <div className={styles.ring}></div>
        <div className={styles.ring}></div>
        <div className={styles.ring}></div>
        <div className={styles.ring}></div>
      </div>
      <p className={styles.text}>Loading...</p>
    </div>
  );
};

export default LoadingScreen;
