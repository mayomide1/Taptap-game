import {Route, Routes} from 'react-router-dom'
import Tapgame from './Tapgame'
import Admin from './Admin'

const App = () => {
  return (
    <>
    <Routes>
      <Route path={"/"} element={<Tapgame />} />
      <Route path={"/admin"} element={<Admin />} />
    </Routes>
    </>
  )
}

export default App