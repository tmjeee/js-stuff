
import {Routes, RouterModule} from "@angular/router";
import {PageNotFoundComponent} from "./page-not-found.component";
import {SpaceGameComponent} from "./space-game.component";
import {MainMenuComponent} from "./main-menu.componnet";


const appRoutes: Routes = [
  { path: 'space', component: SpaceGameComponent },
  { path: '', component: MainMenuComponent },
  { path: '**', component: PageNotFoundComponent }
];

export const AppRoutesModule =  RouterModule.forRoot(appRoutes);
