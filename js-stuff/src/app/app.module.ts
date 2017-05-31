import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from "@angular/forms"
import { HttpModule } from '@angular/http';

import { AppComponent } from './app.component';
import { PageNotFoundComponent } from "./page-not-found.component";
import { SpaceGameComponent } from "./space-game.component";
import { MainMenuComponent } from "./main-menu.componnet";

import {AppRoutesModule} from "./app.routes";

@NgModule({
  declarations: [
    AppComponent,
    PageNotFoundComponent,
    SpaceGameComponent,
    MainMenuComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpModule,
    AppRoutesModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
