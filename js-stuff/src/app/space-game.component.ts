///<reference path="../../node_modules/@angular/core/src/metadata/lifecycle_hooks.d.ts"/>

import {Component, OnInit} from "@angular/core";
import * as Rx from "rxjs/Rx";

interface Locatable {
  x: number,
  y: number
}

interface Visible {
  visible: boolean
}

interface Livable {
  dead: boolean
}

interface Star extends Locatable {
  size: number
}

interface Enemy extends Locatable, Visible, Livable {
  shots: Shot[]
}

interface Shot extends Locatable, Visible {
}

interface Hero extends Locatable, Livable {
}


@Component({
  selector: 'space-game',
  templateUrl: './space-game.component.html',
  styleUrls: ['./space-game.component.css']
})
export class SpaceGameComponent implements OnInit {

  private canvas: any;
  private ctx:any;
  private canvasWidth:number;
  private canvasHeight:number;

  private scoreSubject: Rx.Subject<number>;
  private scoreStream: Rx.Observable<number>;
  private starStream: Rx.Observable<Star[]>;
  private enemiesStream: Rx.Observable<Enemy[]>;
  private heroStream: Rx.Observable<Hero>;
  private heroShotsStream: Rx.Observable<Shot[]>;

  ngOnInit():void {
    this.initCanvas();
    this.initScores();
    this.initStars();
    this.initEnemies();
    this.initHero();
    this.initHeroShots();
    this.initFinally();
  }

  private initCanvas():void {
    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.canvasWidth = this.canvas.width;
    this.canvasHeight = this.canvas.height;

    this.ctx.fillStyle="#ffffff";
    this.ctx.font = "bold 26px sans-serif";
    this.ctx.fillText("Click or Press Key to play", this.canvasWidth/3, this.canvasHeight/2);

  }

  private initScores():void {
    this.scoreSubject = new Rx.Subject();
    let scores =
      this.scoreSubject.scan((prev, curr)=>{
        return prev + curr;
      },0);

    this.scoreStream = Rx.Observable.concat(
      Rx.Observable.of(0),
      scores
    );
  }

  private initStars():void {
    let SPEED = 40;
    let TOTAL = 500;
    let DISTANCE = 3;

    this.starStream =
    Rx.Observable
      .range(1,TOTAL)
      .map((i)=>{
        let star:Star = {
          x: Math.random() * this.canvasWidth,
          y: Math.random() * this.canvasHeight,
          size: (Math.random() * 3)+1
        }
        return star;
      })
      .toArray()
      .flatMap((starsArray:Star[])=>{
        return Rx.Observable
          .interval(SPEED)
          .map((i)=> {
            starsArray.forEach((star)=> {
              if (star.y >= this.canvasHeight) {
                star.y = 0;
              }
              star.y += DISTANCE;
            });
            return starsArray;
          });
      });
  }

  private initEnemies():void {
    let APPEARANCE_FREQ = 1500;
    let SHOOTING_FREQ = 500;
    let ENEMY_INC_Y = 30;
    let BULLET_INC_Y = 50;

    this.enemiesStream =
    Rx.Observable
      .interval(APPEARANCE_FREQ)
      .scan((enemies,i)=>{
        let enemy:Enemy = {
          x: Math.random() * this.canvasWidth,
          y: ENEMY_INC_Y,
          dead: false,
          visible: true,
          shots: []
        };

        Rx.Observable
          .interval(SHOOTING_FREQ)
          .subscribe((i)=> {
            if (!enemy.dead) {
              let shot: Shot = {
                x: enemy.x,
                y: enemy.y + BULLET_INC_Y,
                visible: true
              };
              enemy.shots.push(shot);

              enemy.shots = enemy.shots.filter((shot: Shot)=> {
                return shot.visible;
              });
            }
          });

        enemies.push(enemy);

        return enemies
          .filter((enemy)=> enemy.visible)
          .filter((enemy)=>{
            return (!(enemy.dead && enemy.shots.length === 0));
          });

      }, <Enemy[]>[]);

  }

  private initHero():void {
    let HERO_Y = this.canvasHeight - 30;

    this.heroStream =
    Rx.Observable
      .fromEvent(this.canvas, "mousemove")
      .map((event)=>{
        return <Hero>{
          x: (<any>event).clientX,
          y: HERO_Y,
          dead: false
        }
      })
      .startWith(<Hero>{
          x: (this.canvasWidth/2),
          y: HERO_Y,
          dead: false
        });
  }

  private initHeroShots(): void {

    let firingStream =
    Rx.Observable
      .merge(
        Rx.Observable.fromEvent(this.canvas, "click"),
        Rx.Observable.fromEvent(document.body, "keydown")
          .filter((event)=>(<any>event).keyCode === 32) // spacebar
      )
      .sampleTime(200)
      .timestamp();

    this.heroShotsStream =
    Rx.Observable
      .combineLatest(
        firingStream,
        this.heroStream,
        (firingStreamEvent, heroStreamItem)=>{
          return {
            x: heroStreamItem.x,
            y: heroStreamItem.y,
            timestamp: firingStreamEvent.timestamp
          };
        })
      .distinctUntilChanged((combinedItem1,combinedItem2)=>{
        return (combinedItem1.timestamp === combinedItem2.timestamp);
      })
      .scan((heroShots, combinedItem)=>{
        let heroShot= {
          x: combinedItem.x,
          y: combinedItem.y,
          visible: true
        };
        heroShots.push(heroShot)
        return heroShots.filter((heroShot)=>heroShot.visible);
      },<Shot[]>[])
      ;
  }

  private initFinally(): void {
    let SAMPLE_TIME = 500;
    Rx.Observable
      .combineLatest(
        this.scoreStream,
        this.starStream,
        this.enemiesStream,
        this.heroStream,
        this.heroShotsStream,
        (scoreStreamItem:number, starStreamItem:Star[], enemiesStreamItem:Enemy[], heroStreamItem: Hero,
         heroShotsStreamItem: Shot[])=>{
          return {
            scoreStreamItem: scoreStreamItem,
            starStreamItem: starStreamItem,
            enemiesStreamItem: enemiesStreamItem,
            heroStreamItem: heroStreamItem,
            heroShotsStreamItem: heroShotsStreamItem
          };
        }
      )
      .sampleTime(SAMPLE_TIME)
      .takeWhile((combinedItem)=>{
        return (!combinedItem.heroStreamItem.dead);
      })
      .subscribe((combinedItem)=>{
        this.updateEnemies(combinedItem.enemiesStreamItem);
        this.updateHeroShots(combinedItem.heroShotsStreamItem);
        this.updateScores(combinedItem.heroShotsStreamItem, combinedItem.enemiesStreamItem);

        this.paintBackground();
        this.paintStars(combinedItem.starStreamItem);
        this.paintEnemies(combinedItem.enemiesStreamItem);
        this.paintHero(combinedItem.heroStreamItem);
        this.paintHeroShots(combinedItem.heroShotsStreamItem);
        this.paintScore(combinedItem.scoreStreamItem);
      });
  }


  private updateEnemies(enemiesStreamItem:Enemy[]):void {
    let ENEMY_SPEED = 5;
    enemiesStreamItem.forEach((enemy)=>{
      enemy.y += ENEMY_SPEED;
      enemy.shots.forEach((shot)=>{
        shot.y += ENEMY_SPEED;
      })
    });
  }

  private updateHeroShots(heroShotsStreamItem:Shot[]):void {
    let HERO_SHOT_SPEED = 100;
    heroShotsStreamItem.forEach((shot)=>{
      shot.y -= HERO_SHOT_SPEED;
    });
  }

  private updateScores(heroShotStreamItem:Shot[], enemiesStreamItem:Enemy[]):void {
    const INC_SCORE:number = 10;
    heroShotStreamItem.forEach((heroShot)=>{
      enemiesStreamItem.forEach((enemy)=>{
        if (heroShot.visible && (!enemy.dead) && this.isCollision(heroShot, enemy)) {
          this.scoreSubject.next(INC_SCORE);
          enemy.dead = true;
          enemy.visible = false;
          heroShot.visible = false;
        }
      })
    });
  }


  private paintBackground():void {
    this.ctx.fillStyle="#000000";
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  private paintStars(starStreamItem:Star[]):void {
    this.ctx.fillStyle="#ffffff";
    starStreamItem.forEach((star)=>{
      this.ctx.fillRect(star.x, star.y, star.size, star.size);
    })
  }

  private paintEnemies(enemiesStreamItem:Enemy[]):void {
    enemiesStreamItem.forEach((enemy)=>{
      if(!enemy.dead) {
        this.drawTriangle(enemy, 20, "#00ff00", false);
      }

      enemy.shots.forEach((shot)=>{
        if (shot.visible) {
          this.ctx.fillStyle="#00ffff";
          this.ctx.fillRect(shot.x, shot.y, 10, 10);
        }
      })
    });
  }

  private paintHero(heroStreamItem:Hero):void {
    this.drawTriangle(heroStreamItem, 20, "#ff0000", true);
    if (heroStreamItem.dead) {
      this.ctx.fillStyle="#ffffff";
      this.ctx.font = "bold 26px sans-serif";
      this.ctx.fillText("GAME OVER !!!", this.canvasWidth/2, this.canvasHeight/2);
    }
  }

  private paintHeroShots(heroShotsStreamItem:Shot[]):void {
    this.ctx.fillStyle="#00ffff";
    heroShotsStreamItem.forEach((shot)=>{
      this.ctx.fillRect(shot.x, shot.y, 10, 10);
    })
  }

  private paintScore(scoreStreamItem:number):void {
    this.ctx.fillStyle="#ffffff";
    this.ctx.font = "bold 26px sans-serif";
    this.ctx.fillText("Score: "+scoreStreamItem, 40, 43);
  }


  private drawTriangle(locatable: Locatable, width: number, color: string, directionUp: boolean) {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(locatable.x - width, locatable.y);
    this.ctx.lineTo(locatable.x, directionUp ? locatable.y - width : locatable.y + width);
    this.ctx.lineTo(locatable.x + width, locatable.y);
    this.ctx.lineTo(locatable.x - width, locatable.y);
    this.ctx.fill();
  }


  private isVisible(obj: Locatable): boolean {
    return (obj.x > -40 && obj.x < this.canvasWidth + 40 &&
    obj.y > -40 && obj.y < this.canvasHeight + 40);
  }


  private isCollision(target1: Locatable, target2: Locatable): boolean {
    return (
      (target1.x > target2.x - 20 && target1.x < target2.x + 20) &&
      (target1.y > target2.y - 20 && target1.y < target2.y + 20)
    );
  }
}



