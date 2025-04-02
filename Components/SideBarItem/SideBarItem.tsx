import styles from '../../styles/Home.module.scss';

export default function SideBarItem({ key, value }) {

  return (
    <div className={styles.sideBarItemWrapper}>
      <h1>{key}</h1>
      <h2>{value}</h2>
    </div>
  );
}