import { Vector, intersect } from "./vector.js";
import { cn, strokeToScore } from "./data.js";

function deviceType() {
    try {
        document.createEvent("TouchEvent");
        return "touch";
    } catch (e) {
        return "mouse";
    }
}

const events = {
    mouse: { down: "mousedown", move: "mousemove", up: "mouseup" },
    touch: { down: "touchstart", move: "touchmove", up: "touchend" }
};

export class Hole {
    constructor(l, x, y, r) {
        this.pos = new Vector(x, y);
        this.radius = r;
        this.ctx = l.ctx;
        this.level = l;
    }
    draw() {
        let d = this.level.ball.pos.difference(this.pos).length();
        if (d > 2 * this.radius) d = 0;
        this.ctx.beginPath();
        this.ctx.arc(this.pos.x, this.pos.y, this.radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = "black";
        this.ctx.fill();
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.fillStyle = "red";
        this.ctx.lineTo(this.pos.x + 1.5 * this.radius, this.pos.y - 1.5 * this.radius - d);
        this.ctx.lineTo(this.pos.x, this.pos.y - this.radius - d);
        this.ctx.lineTo(this.pos.x, this.pos.y - 2 * this.radius - d);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(this.pos.x, this.pos.y - d);
        this.ctx.lineTo(this.pos.x, this.pos.y - 2 * this.radius - d);
        this.ctx.strokeStyle = "white";
        this.ctx.stroke();
    }
    collision(o) {
        return this.pos.difference(o.pos).length() < this.radius + o.radius;
    }
}

export class SandTrap {
    constructor(l, c, f, rot, x, y, w, h) {
        this.pos = new Vector(x, y);
        this.radii = new Vector(w / 2, h / 2);
        this.color = c;
        this.rotation = rot ? rot / 180 * Math.PI : 0;
        this.ctx = l.ctx;
        this.level = l;
        this.func = f;
    }
    draw() {
        this.ctx.beginPath();
        this.ctx.fillStyle = this.color;
        this.ctx.ellipse(this.pos.x, this.pos.y, this.radii.x, this.radii.y, this.rotation, 0, 2 * Math.PI);
        this.ctx.fill();
    }
    collision(p) {
        let d = p.difference(this.pos);
        let t1 = Math.pow(d.x * Math.cos(this.rotation) + d.y * Math.sin(this.rotation), 2);
        let t2 = Math.pow(d.x * Math.sin(this.rotation) - d.y * Math.cos(this.rotation), 2);
        return t1 / (this.radii.x * this.radii.x) + t2 / (this.radii.y * this.radii.y) < 1;
    }
}

export class Ball {
    constructor(l, x, y, r, c) {
        this.pos = new Vector(x, y);
        this.speed = new Vector(0, 0);
        this.radius = r;
        this.color = c;
        this.ctx = l.ctx;
        this.level = l;
    }
    update() {
        this.move();
        this.level.event(this.pos);
        if (this.level.hole.collision(this)) {
            let d = this.level.hole.pos.difference(this.pos);
            d.scalar(cn.hole_force);
            this.speed.add(d);
        }
        if (this.speed.length() <= cn.speed_clamp) this.speed.scalar(0);
        this.checkWin();
    }
    draw() {
        if (this.level.mouseEnd && this.level.mouseStart && !this.level.won) {
            let e = this.level.mouseEnd.difference(this.level.mouseStart);
            e.clamp_length(cn.clamp_amount);
            e.scalar(-1);
            this.ctx.strokeStyle = this.speed.length() !== 0 ? "gray" : `hsl(${(1 - (e.length() - this.radius) / (60 - this.radius)) * 100},100%,50%)`;
            let pr = e.perpendicular();
            let a = e.angle();
            if (a > 90 || a < -90) pr.scalar(-1);
            this.ctx.shadowColor = "black";
            this.ctx.lineWidth = 3;
            this.ctx.shadowOffsetX = pr.x * 2;
            this.ctx.shadowOffsetY = pr.y * 2;
            e.add(this.pos);
            this.ctx.beginPath();
            this.ctx.moveTo(this.pos.x, this.pos.y);
            this.ctx.lineTo(e.x, e.y);
            this.ctx.stroke();
            this.ctx.strokeStyle = "black";
        }
        this.ctx.shadowColor = "";
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.beginPath();
        this.ctx.arc(this.pos.x, this.pos.y, this.radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = "white";
        this.ctx.fill();
    }
    move() {
        if (this.level.won) return;
        let c = this.level.collision(this.pos, this.pos.sum(this.speed));
        if (c) {
            while (!this.level.collision(this.pos, this.pos.sum(this.speed.normal()))) {
                this.pos.add(this.speed.normal());
            }
            c = this.level.collision(this.pos, this.pos.sum(this.speed.normal()));
            this.speed.reflect(c.normal);
            this.speed.scalar(c.friction);
            this.speed.clamp_length(cn.clamp_amount);
        } else {
            this.pos.add(this.speed);
        }
    }
    checkWin() {
        if (this.level.won) return;
        if (this.level.hole.collision(this) && this.speed.length() === 0 && this.level.hole.pos.difference(this.pos).length() < cn.hole_diff) {
            this.level.finishLevel();
            this.speed.scalar(0);
            this.pos = this.level.hole.pos.copy();
        }
    }
}

export class Polygon {
    constructor(l, c, d, f) {
        this.color = c;
        this.level = l;
        this.ctx = l.ctx;
        this.canvas = l.canvas;
        this.data = d;
        this.friction = f === undefined ? cn.friction : f;
    }
    draw(o = false) {
        this.ctx.fillStyle = this.color;
        if (o) {
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.globalCompositeOperation = 'destination-out';
        }
        let p = this.data[0];
        this.ctx.moveTo(p.x, p.y);
        this.ctx.beginPath();
        for (let i = 1; i <= this.data.length; i++) {
            let pt = this.data[i % this.data.length];
            this.ctx.lineTo(pt.x, pt.y);
        }
        this.ctx.fill();
        this.ctx.globalCompositeOperation = 'source-over';
    }
    collision(p1, p2) {
        for (let i = 0; i < this.data.length; i++) {
            let a = this.data[i];
            let b = i === this.data.length - 1 ? this.data[0] : this.data[i + 1];
            if (intersect(p1, p2, a, b)) return { normal: b.difference(a).perpendicular(), friction: this.friction };
        }
    }
}

export class App {
    constructor(lv) {
        this.canvas = undefined;
        this.ctx = undefined;
        this.highscore = Infinity;
        this.level_number = 0;
        this.levels = lv;
        this.scores = [];
        this.strokes = 0;
        this.won = false;
        this.par = 0;
        this.mouseEnd = undefined;
        this.mouseStart = undefined;
        this.device = undefined;
        this.game = undefined;
        this.polygons = undefined;
        this.ball = undefined;
        this.hole = undefined;
        this.themeSound = new Audio('./golf_bg.mp3');
        this.themeSound.loop = false;
        this.hitSound = new Audio('./ball_hit.mp3');
        this.holeSound = new Audio('./hole.mp3');
        this.nextLevelSound = new Audio('./nextLevel.mp3');
    }
    start() {
        this.canvas = document.createElement("canvas");
        $(this.canvas).hide();
        this.ctx = this.canvas.getContext("2d");
        $("#content_div").append(this.canvas);
        this.load_level(this.level_number);
        this.interval = setInterval(this.updateGameArea.bind(this), 20);
        this.device = deviceType();
        $(document).on(events[this.device].move, this.updateMouse.bind(this));
        $(this.canvas).on(events[this.device].down, this.pressMouse.bind(this));
        $(document).on(events[this.device].up, this.releaseMouse.bind(this));
        $("#next_level").on("click", this.increment_level.bind(this));
    }
    increment_level() {
        if (this.level_number > -1) this.scores.push(this.strokes - this.par);
        this.game = undefined;
        this.polygons = undefined;
        this.ball = undefined;
        this.hole = undefined;
        this.strokes = 0;
        this.won = false;
        $("#next_level").prop("disabled", true);
        this.level_number++;
        if (this.level_number >= this.levels.length) {
            let from = { height: $(this.canvas).prop("height") };
            let to = { height: 0 };
            $(this.canvas).fadeOut(500);
            $(from).animate(to, {
                duration: 500,
                step: function() {
                    $("canvas").attr("height", this.height);
                }
            });
            this.load_table();
            this.scores.length = 0;
            this.level_number = -1;
        } else {
            this.nextLevelSound.play().catch(() => {});
            this.load_level(this.level_number);
        }
    }
    load_level(n) {
        let d = this.levels[n];
        this.mouseEnd = undefined;
        this.mouseStart = undefined;
        $("#par_label").html(`Par: ${d.par}`);
        $("#stroke_label").html(`Strokes: 0`);
        $("#next_level").html(n + 1 === this.levels.length ? "See Results" : `Next Level`);
        $("#tip_label").html("tip" in d ? d.tip : "");
        $("table").remove();
        let gc = d.game.color === undefined ? "var(--green)" : d.game.color;
        if ($(this.canvas).is(":hidden")) {
            $(this.canvas).fadeIn("slow");
            $(this.canvas).css("filter", "brightness(1)");
            $(this.canvas).prop("aspectRatio", d.game.width / d.game.height);
            $(this.canvas).prop("width", d.game.width);
            $(this.canvas).prop("height", d.game.height);
            $(this.canvas).css("background-color", gc);
        } else {
            $(this.canvas).css("background-color", "black");
            let f = { width: $(this.canvas).prop("width"), height: $(this.canvas).prop("height") };
            let t = { width: d.game.width, height: d.game.height };
            $(f).animate(t, {
                duration: 500,
                step: function() {
                    $("canvas").attr("width", this.width);
                    $("canvas").attr("height", this.height);
                },
                complete: () => $("canvas").css("filter", "brightness(1)").css("background-color", gc)
            });
            $(this.canvas).prop("aspectRatio", d.game.width / d.game.height);
        }
        this.strokes = 0;
        this.par = d.par;
        this.won = false;
        this.polygons = !("polygons" in d)
            ? []
            : d.polygons.map(p => new Polygon(this, p.color, p.data.map(it => new Vector(it[0], it[1])), p.friction));
        this.hole = new Hole(this, d.hole.x, d.hole.y, d.hole.radius);
        this.ball = new Ball(this, d.ball.x, d.ball.y, d.ball.radius, d.ball.color);
        this.sand_traps = !("sand_traps" in d)
            ? []
            : d.sand_traps.map(s => new SandTrap(this, s.color, s.func, s.rotation, ...s.dimensions));
        this.themeSound.currentTime = 0;
        this.themeSound.play().catch(() => {});
    }
    load_table() {
        let total = this.scores.reduce((a, b) => a + b, 0);
        this.highscore = Math.min(total, this.highscore);
        $("#stroke_label").html(`High Score: ${this.highscore}`);
        $("#par_label").html(`Total Score: ${total}`);
        $("#next_level").prop("disabled", false).html("Play Again");
        $("#tip_label").html("Thanks for playing!");
        let tab = $("<table></table>");
        $("#content_div").prepend(tab);
        let idx = $("<tr><td>Hole</td></tr>");
        let scr = $("<tr><td>Score</td></tr>");
        for (let i = 0; i < this.scores.length; i++) {
            idx.append(`<td>${i + 1}</td>`);
            scr.append(`<td>${this.scores[i]}</td>`);
        }
        idx.append(`<td>Total</td>`);
        scr.append(`<td>${total}</td>`);
        $(tab).append(idx, scr);
    }
    increment_stroke(a) {
        a = a === undefined ? 1 : a;
        this.strokes += a;
        $("#stroke_label").html(`Strokes: ${this.strokes}`);
    }
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    draw() {
        if (this.polygons) {
            for (let i = 0; i < this.polygons.length; i++) {
                this.polygons[i].draw(i === 0);
            }
        }
        if (this.sand_traps) {
            for (let i = 0; i < this.sand_traps.length; i++) {
                this.sand_traps[i].draw();
            }
        }
    }
    updateGameArea() {
        this.clear();
        this.draw();
        if (this.ball && this.hole) {
            this.ball.update();
            this.hole.draw();
            this.ball.draw();
        }
    }
    finishLevel() {
        this.won = true;
        $("#par_label").html(`Completed with a ${strokeToScore(this.strokes, this.par)}`);
        $(this.canvas).css("filter", "brightness(0)");
        $("#next_level").prop("disabled", false);
        this.themeSound.pause();
        this.themeSound.currentTime = 0;
        this.holeSound.play().catch(() => {});
    }
    collision(p1, p2) {
        for (let poly of this.polygons) {
            let v = poly.collision(p1, p2);
            if (v !== undefined) return v;
        }
    }
    event(pos1) {
        for (let st of this.sand_traps) {
            if (st.collision(pos1)) {
                st.func(this);
                return;
            }
        }
        this.ball.speed.scalar(cn.friction);
    }
    pressMouse(e) {
        let b = this.canvas.getBoundingClientRect();
        e.preventDefault();
        let c = { x: this.device === "mouse" ? e.pageX : e.touches[0].pageX, y: this.device === "mouse" ? e.pageY : e.touches[0].pageY };
        this.mouseStart = new Vector(c.x - b.left, c.y - b.top);
        this.mouseEnd = new Vector(c.x - b.left, c.y - b.top);
    }
    updateMouse(e) {
        if (this.mouseStart === undefined) return;
        let b = this.canvas.getBoundingClientRect();
        e.preventDefault();
        let c = { x: this.device === "mouse" ? e.pageX : e.touches[0].pageX, y: this.device === "mouse" ? e.pageY : e.touches[0].pageY };
        this.mouseEnd.x = c.x - b.left;
        this.mouseEnd.y = c.y - b.top;
    }
    releaseMouse() {
        if (this.mouseEnd === undefined || this.mouseStart === undefined) return;
        let diff = this.mouseEnd.difference(this.mouseStart);
        diff.clamp_length(cn.clamp_amount);
        diff.minus_scalar(this.ball.radius);
        if (this.ball.speed.length() === 0 && diff.length() > 0 && !this.won) {
            diff.scalar(-cn.ball_force);
            this.ball.speed.add(diff);
            this.increment_stroke();
            this.hitSound.play().catch(() => {});
        }
        this.mouseStart = undefined;
        this.mouseEnd = undefined;
    }
}
