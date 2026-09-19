import * as GA from '@bsorrentino/ga-ts'

/**
 * 
 */
interface Submarine extends GA.Sprite {

  playit:(cycle:number)=>void;

  start:()=>void;
  strike:()=>void

  fire:()=>void;
}

/**
 * 
 */
interface Submarine2 extends GA.Sprite {

  playit:(cycle:number)=>void;

  start:()=>void;
  strike:()=>void

  fire:()=>void;
}

interface Bomb extends GA.DisplayableObject {
  isLeft:boolean;
  isRight:boolean;
  isInTheSea:boolean;

  play:(cycle:number)=>void;
  
  boom:()=>void;
  fire:()=>void;
}

type BombShape = Bomb & (GA.Rectangle | GA.Circle)

interface Cruise extends GA.DisplayableObject {

  play:(cycle:number)=>void;

}

interface ScoreDisplay extends GA.Text {

  currentScore:number;

  increment:( score?:number )=>void;
  decrement:( score?:number )=>void;

}

class Torpedoes {
  items:Array<GA.DisplayableObject>

  constructor(  ) {
    this.items = [];
  }

  play(cycle:number):void {

    this.items = this.items.filter( (item) => {
      if( item.y == horizon.ay ) {
        g.remove( item );
        return false;
      }

      return true;
    });
    g.move( this.items );
  }

}

const SZ = 8;

const g = new GA.Engine( 80*SZ, 60*SZ, 
                setup, [ 
                  "/images/submarine.json",
                  "/images/cruise.json"
                ], load);
g.backgroundColor = "white";  
g.canvas.style.border = "1px black dashed";
g.start();

const CRUISE_VELOCITY = 2;

var cruise:Cruise,
    submarines:Array<Submarine|Submarine2>,
    bombs:Array<Bomb>,
    torpedoes:Torpedoes,
    horizon:GA.Line,
    sea:GA.DisplayableObject,
    scoreDisplay:ScoreDisplay,
    end
;

/**
 * 
 */
function load() {
  console.log( "ASSETS LOADED!!!");
}

/** 
    `setup` function that will run only once.
    Use it for initialization tasks
*/
function setup() {
  console.log( "setup", "canvas.w", g.canvas.width, "canvas.h", g.canvas.height);


  let deepY = 9*SZ;

  sea = g.rectangle( g.canvas.width,  g.canvas.height - deepY, "cyan" );
  sea.setPosition( 0, deepY );


  horizon = g.line( "blue", 1, 0, sea.y+1, sea.width, sea.y+1);
  horizon.lineJoin = "bevel";
  //let scene = g.group();

  g.key.leftArrow.press = () => {
      cruise.vx = -CRUISE_VELOCITY ;
  }
  g.key.leftArrow.release = () => {
    cruise.vx = 0 ;
  }
  g.key.rightArrow.press = () => {
      cruise.vx = CRUISE_VELOCITY ;
  }
  g.key.rightArrow.release = () => {
    cruise.vx = 0 ;    
  }
  g.key.upArrow.press = () => {
       let b = bombs.filter( (b) => b.isRight ).filter( (b) => !b.visible );
       if( b[0] ) b[0].fire();
  }
  g.key.downArrow.press = () => {
       let b = bombs.filter( (b) => b.isLeft ).filter( (b) => !b.visible );
       if( b[0] ) b[0].fire();
  }

  ///
  /// SCORE
  /// 
  scoreDisplay = g.text("0", "20px emulogic", "black") as ScoreDisplay;
  {
    g.stage.putRight(scoreDisplay); let x = scoreDisplay.x - scoreDisplay.width * 6;
    g.stage.putTop(scoreDisplay); scoreDisplay.x = x; scoreDisplay.y += scoreDisplay.height + 5;

    let label = g.text( "SCORE: ", "20px emulogic", "pink" );
    scoreDisplay.putLeft( label ); label.x -= label.width;

    scoreDisplay.currentScore = 0;

    scoreDisplay.increment = (score?:number) => {
      scoreDisplay.currentScore += score || 1;

      scoreDisplay.content = String(scoreDisplay.currentScore);
    }

    scoreDisplay.decrement = (score?:number) => {
      scoreDisplay.currentScore -= score || 1;
      scoreDisplay.content = String(scoreDisplay.currentScore); 
    }
  }
  
  ///
  /// CRUISE
  /// 
  //cruise = <any>g.rectangle(11*SZ, 3*SZ, "black" );
  cruise = g.sprite( "cruise0.png" ) as Cruise;
  
  g.stage.putCenter( cruise ); 
  cruise.y = sea.y - cruise.height;

  cruise.play = (cycle:number) => {
    let collision = g.contain(cruise, g.stage.localBounds);
    
    if( !collision ) g.move( cruise );

  }

  //
  // SUBMARINES
  // 

  torpedoes = new Torpedoes();

  const SUB_NUMBER = 4;

  submarines = new Array<Submarine>( SUB_NUMBER );
  for( var ii = 0; ii < SUB_NUMBER ; ++ii ) {

    let sub:Submarine = 
        //<Submarine>g.rectangle(11*SZ, 3*SZ, "black" ) ; 
        g.sprite( "submarine0.png" /*["submarine0.png", "submarine1.png", "submarine2.png"]*/ ) as Submarine;

    sub.visible = false;

    sub.start =  () => {
      let rnd = g.randomInt( 0, 100 );
      if( rnd%2 === 0 ) {
        sub.vx = -1    
        g.stage.putRight(sub);
      }
      else {
        sub.vx = 1;
        g.stage.putLeft(sub);
      }
      sub.y = g.randomInt( sea.y, sea.height + sea.y) + sub.height;

      g.wait( g.randomInt( 750, 1500 ), () => { 
        sub.visible = true; 
        //sub.show(1); 
        //sub.play();
      });
    }

    sub.playit = ( cycle:number ) => {

        let pos = cruise.x + cruise.halfWidth;
        //console.log(cruise.x, cruise.halfWidth );
        if( sub.vx > 0 && sub.x == pos) {
          //sub.fillStyle = "red";
          sub.fire();       
        }
        else if( sub.vx < 0 && sub.x == pos ) {
          //sub.fillStyle = "red";   
          sub.fire();       
        }
        else {
          //sub.fillStyle = "black";
        }
      if( cycle%3===0 ) { 
        g.move(sub);
      }
    }

    sub.strike = () => {

      sub.visible = false;
      scoreDisplay.increment();
    }

    let shoot_angle = Math.PI / 2;
    sub.fire = () => {
      g.shoot( {
        shooter:          sub, 
        angle:            shoot_angle , 
        offsetFromCenter: -10, 
        bulletSpeed:      -1, 
        bulletArray:      torpedoes.items, 
        bulletSprite:     () => g.rectangle( 2, 10, "gray")
      });
    }
    submarines.push(  sub  );
  }


  //
  // BOMBS
  // 

  //let b1 = g.circle( 10, "red"); b1.isLeft = true;
  //let b2 = g.circle( 10, "black"); b2.isRight = true;
  let b1 = g.rectangle( 10, 10,  "red") as BombShape 
  b1.isLeft = true;
  let b2 = g.circle( 10,  "red") as BombShape; 
  b2.isLeft = true;
  let b3 = g.rectangle( 10, 10, "black") as BombShape
  b3.isRight = true;
  let b4 = g.circle( 10, "black") as BombShape
  b4.isRight = true;

  bombs = new Array<Bomb>(  b1, b2, b3, b4 );

  bombs.forEach( (bomb) => {
    bomb.visible = false;

    bomb.fire = () => {

      bomb.visible = true;

      var points:Array<[number,number]>;

      if( bomb.isLeft ) {
        cruise.putLeft(bomb);   
        let x = bomb.x, y = bomb.y;
        points =
          [
            [x,y],
            [x - 5.22*10, y - 7.22*10],
            [x - 7.87*10, y - 3.54*10],
            [x - 8.00*10, y + cruise.height]
          ];       
      }
      else {
        cruise.putRight(bomb);
        let x = bomb.x, y = bomb.y;
        points = 
            [
              [x, y],
              [x + 5.22*10, y - 7.22*10],
              [x + 7.87*10, y - 3.54*10],
              [x + 8.00*10, y + cruise.height]
            ];    
          
      }

      g.walkCurve({
          sprite:             bomb, //The sprite you want to connect in sequence
          pathArray:          [ points ],//An array of Bezier curve points that
          totalFrames:        100,                   //Total duration, in frames
          type:               "smoothstep",          //Easing type
          loop:               false,                  //Should the path loop?
          yoyo:               false,                  //Should the path yoyo?
          delayBeforeContinue:1000                   //Delay in milliseconds between segments
      })

    }

    bomb.boom = () => {
      bomb.visible = false;
      bomb.isInTheSea = false;
    }

    bomb.play = (cycle:number) => {
      if( cycle%2!==0) return;
       
      let pos =  (bomb.isLeft) ? "left" : "right";
      
      let wasInTheSea = bomb.isInTheSea;

      bomb.isInTheSea = g.hitTestRectangle( bomb, sea );
      if( bomb.isInTheSea ) {
        //console.log( "bomb ", pos ," in the sea", bomb.isInTheSea );
        bomb.vy = 1

        g.move(bomb);

        submarines
          .filter( (sub) => sub.visible )
          .forEach( (sub) => {
            if( g.hitTestRectangle(bomb,sub) ) {
              bomb.boom();
              sub.strike();
            }
            
          });

      }
      else if( wasInTheSea ) {
        console.log( "bomb ", pos ," out of sea", bomb.isInTheSea );
        bomb.visible = false;

      }
      
    }
  });
  
    //Change the state to `play`
  g.state = play;
  
}

let cycle = 0;
//The `play` function will run in a loop
function play() {

    ++cycle;
    
    if( cycle%20 === 0 ) submarines.filter( (s) => !s.visible ).forEach( (s) => s.start() );

    bombs.filter( (b) => b.visible ).forEach( (b) => b.play(cycle) );
   
    submarines.filter((s) => s.visible).forEach( (s) => s.playit(cycle) );

    cruise.play( cycle );

    torpedoes.play( cycle );


}

