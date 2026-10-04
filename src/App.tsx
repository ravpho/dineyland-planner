import { useRoute } from './routing'
import AboutScreen from './screens/AboutScreen'
import CatalogScreen from './screens/CatalogScreen'
import ImportScreen from './screens/ImportScreen'
import PlanScreen from './screens/PlanScreen'

export default function App() {
  const route = useRoute()
  return (
    <main className="p-4">
      {route.name === 'catalog' && <CatalogScreen />}
      {route.name === 'plan' && <PlanScreen />}
      {route.name === 'about' && <AboutScreen />}
      {route.name === 'import' && <ImportScreen />}
    </main>
  )
}
