import { IconCaret } from './icons';

export default function Header() {
  return (
    <div className="aj-head">
      <div>
        <div className="aj-brand">
          <span className="aj-jar">🫙</span>
          <span className="aj-name">Artikel<span className="o">J</span>ar</span>
          <span className="aj-tag">
            sort the <span className="b">der</span> · <span className="p">die</span> · <span className="n">das</span>
          </span>
        </div>
      </div>
      <div className="aj-level" title="Only A1 for now">
        <span className="lv">level</span>
        <b>A1</b>
        <IconCaret />
      </div>
    </div>
  );
}
