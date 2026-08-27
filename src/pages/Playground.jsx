import AttitudeBench from "../components/AttitudeBench.jsx";
import { Page } from "../components/SiteChrome.jsx";

export default function Playground() {
  // The bench brings its own padding and background, so the shell gives it
  // the full width under the nav.
  return (
    <Page pad={false}>
      <AttitudeBench />
    </Page>
  );
}
