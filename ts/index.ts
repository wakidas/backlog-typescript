import "dotenv/config";
import { EngineerFixed, OffshoreFixed } from "./counter";

class BugCounter {
  constructor(date: { begin?: string; end?: string }) {
    // 引数なしで実行した場合、当月1日〜当月末を期間とする
    this.begin_date = date.begin || this.setInitialBeginDate();
    this.end_date = date.end || this.setInitialEndDate(this.begin_date);
    this.params = {
      begin: this.begin_date,
      end: this.end_date,
    };
  }

  private begin_date: string = "";
  private end_date: string = "";
  private params: {
    begin: string;
    end: string;
  } = {
    begin: "",
    end: "",
  };

  private setInitialBeginDate() {
    const date = new Date();
    date.setDate(1);

    const beginning_date = this.makeDateString(date);
    return beginning_date;
  }

  private setInitialEndDate(begin_date: string) {
    const date = new Date(begin_date);
    date.setMonth(date.getMonth() + 1);
    date.setDate(0);

    const end_date = this.makeDateString(date);

    return end_date;
  }

  private makeDateString(date: Date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0"); //API仕様に合わせるため桁数を2桁にする
    const day = date.getDate().toString().padStart(2, "0"); //API仕様に合わせるため桁数を2桁にする

    return `${year}-${month}-${day}`;
  }

  public start() {
    new EngineerFixed(this.params).start();
    new OffshoreFixed(this.params).start();
  }
}

(async () => {
  new BugCounter({
    begin: process.argv[2],
    end: process.argv[3],
  }).start();
})();
