/**
 * @file others/countdown.js
 * @desc 倒计时
 * @date 2020/07/09
 * @status released
 * @version 1
 * */

const { abs } = Math;
const { now } = Date;
const MAGIC_TIME = 10000; // 触发时间异常的时间差 (ms)

/***
 * @class Count - 用来包装计时事件的回调参数
 */
export class Count {
  /**
   * @constructor
   * @param duration - 时间差，为微秒数
   * @param {Number} moment
   */
  constructor(duration, moment) {
    const { floor, ceil } = Math;
    const seconds = floor(duration / 1000);

    const today = new Date(moment).getDay();
    const destiny = new Date(moment + duration).getDay();
    // Use this offset to judge if the
    const daysOff = destiny >= today ? destiny - today : destiny - today + 7;
    const daysLeft = floor(seconds / 86400);

    // Fixme 是否还有其他需要考虑的可能？？？
    if (daysLeft % 7 !== daysOff) {
      this.day = daysLeft + 1;
    } else {
      this.day = daysLeft;
    }

    this.days = daysLeft;
    this.outTime = duration < 0;
    this.hour = floor((seconds % 86400) / 3600);
    this.minute = floor((seconds % 3600) / 60);
    this.second = seconds % 60;
    this.secondTotal = duration;
  }
}

const EMPTY_EVENT_HANDLER = () => {};

// 全局倒计时单例
export class Countdown {
  /**
   * @param {Object|*} [options] - 计时器配置参数
   * @param {Number} [options.baseTime] - 基准时间，通常为服务器时间
   */
  constructor(options = {}) {
    const { baseTime } = options;

    this.taskQueue = [];
    this.timeOffset = 0;
    this.lastMoment = now(); // 使用 “上一个时间切片”作为判断外部时钟异常的基准
    this.fixTimeOffset(baseTime);
    this.count();
    this.timeFixerIndex = -1;
    this.timeFixer = null;
  }

  /**
   * @method addTask - 添加任务
   * @param {Number} time - 时间
   * @param {Function} task
   * todo @param {Number} [duration = 1000] - 执行回调的周期(ms),为 0 的时候表示直到指定时间才执行一次任务
   *   针对任务特点采用不同的周期，便于计时器规划时间、减少回调执行次数
   * @throws {TypeError}
   */
  addTask(time, task /*, duration = 1000*/) {
    if (!task instanceof Function)
      throw new TypeError("task must be a function!");
    const {
      taskQueue,
      taskQueue: { length },
    } = this;

    taskQueue.push([time, task, length]);

    // 新任务立即执行一次
    setTimeout(this.processTasks.bind(this), 0);

    return taskQueue.length - 1;
  }

  /***
   * @param index
   */
  removeTask(index) {
    return this.shiftTask(index, this.taskQueue[index][0], EMPTY_EVENT_HANDLER);
  }

  /**
   * @method shiftTask - 将在执行的任务换成另外一个
   * @param {Number} index - 需要切换的任务编号
   * @param {Number} time - 目标时间
   * @param {Function} task - 任务回调函数
   */
  shiftTask(index, time, task) {
    if (!task instanceof Function)
      throw new TypeError("task must be a function");
    const taskArr = this.taskQueue[index];
    taskArr[0] = time;
    taskArr[1] = task;
    return this;
  }

  /**
   * @method processTasks - 处理挂载的所有任务
   * @throws {Error} - 只会抛出执行中所遇到的第一个错误，以便开发者自行逐个修正，这样可能不便于错误的处理，
   *     因此 task 函数最好能够自行处理错误而非向上抛出
   */
  processTasks() {
    const { taskQueue, calculate, timeOffset, getMoment, lastMoment } = this;

    const errQueue = [];
    const moment = getMoment(timeOffset);

    for (let task of taskQueue) {
      try {
        const [time, resolver, index] = task;

        if (!resolver || resolver === EMPTY_EVENT_HANDLER) return;

        const duration = time - moment;

        const count = calculate(duration, moment);

        if (duration < 0) {
          // 超时的时候，进行复核
          const moment = getMoment();
          if (abs(moment - lastMoment) <= MAGIC_TIME) {
            resolver(count);
          }
        } else {
          resolver(count);
        }

        /*if(count.outTime) {
                     this.removeTask(index);
                 }*/
      } catch (err) {
        errQueue.push(err);
      }
    }

    if (errQueue.length) {
      throw errQueue[0];
    }
  }

  /***
   * @method addTimeFixer - 添加时间修正器
   * @desc 通过指定方法获取一个参考时间，来修正本组件运行的时间
   * @param {function(*=Promise<Number>)} callback - 修正器函数，确保这个函数返回的 Promise 中含有参考时间戳
   * @return {CountdownRuntime}
   */
  addTimeFixer(callback) {
    if (!callback instanceof Function) throw "callback must be a function";

    this.timeFixer = callback;

    return this;
  }

  /***
   * @method calculate - 计算倒计时
   * @param {Number} duration - 时差
   * @param {Number} moment - 此时此刻的时间戳
   * @return {Object} count
   * @return {Count}
   */
  calculate(duration, moment) {
    return new Count(duration, moment);
  }

  /***
   * @method fixTimeOffset - 传入基准时间，来修正时间差
   */
  fixTimeOffset(baseTimeStamp) {
    const moment = this.getMoment();
    this.timeOffset = moment - (baseTimeStamp || moment);
    this.lastMoment = this.getMoment();
    return this;
  }

  setTimer() {
    this.timer = setTimeout(() => {
      this.processTasks();
      this.count();
      this.lastMoment = this.getMoment();
    }, 500);
    return this;
  }

  count() {
    const { lastMoment, timeFixer } = this;
    const moment = this.getMoment();

    if (
      timeFixer instanceof Function &&
      abs(moment - lastMoment) > MAGIC_TIME
    ) {
      timeFixer()
        .then((baseTime) => {
          this.fixTimeOffset(baseTime);
          this.setTimer();
        })
        .catch((err) => {
          this.setTimer();
          throw err;
        });
    } else {
      this.setTimer(2);
    }
    return this;
  }

  /**
   * @method getMoment - 获取当前时间戳
   * @param {Number} offset - 系统时间与基准时间的时间差(ms)
   * @return {Number} 从系统时间获取的毫秒级时间戳
   */
  getMoment(offset = 0) {
    return now() - offset;
  }

  pause() {
    clearTimeout(this.timer);
  }
}

/***
 * @function daysTransfer - 将剩余天数转为人类可读的文字表述
 * @param day
 * @return {string|string}
 */
export const daysTransfer = (day = 0) => {
  const daysSet = ["今日", "明日", "后天"];
  const weekDaySet = "日一二三四五六日一二三四五六";
  if (day < 3) {
    return daysSet[day | 0];
  } else if (day < 8) {
    const weekDay = new Date().getDay();
    const destinyDay = weekDay + day;
    return `${destinyDay > 6 ? "下" : "本"}周${weekDaySet[destinyDay | 0]}`;
  } else {
    return `${day | 0}天后`;
  }
};

/**
 * @function countDownToText - 将倒计时转为可读文本
 * @todo 加 padding
 * @param {Number} [second = 0]
 * @param {Number|*} [minute = 0]
 * @param {Number|*} [hour]
 * @param {Number|*} [day]
 * @returns {string}
 */
export const countDownToText = (second, minute, hour, day) => {
  const dayText = day ? `${day}天` : "";
  const hourText = hour ? `${hour}时` : "";

  return `${dayText}${hourText}${minute | 0}分${second | 0}秒`;
};

/*
   // 使用方法示例
   
   // 初始化一个倒计时管理器
   const countdownManager = new Countdown({ baseTime: Date.new() });
    
   // 添加一个倒计时任务
   countdownManager.addTask( Date.new() + 3600, ({ 
    days,
    hour,
    minute,
    second
   }) => {
       console.log(`还剩：${countDownToText(second, minute, hour, days)}`)
   });
  */
