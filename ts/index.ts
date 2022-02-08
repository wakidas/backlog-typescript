import "dotenv/config";
import fetch from "node-fetch";

type Tickets = {
  target: string;
  engineer?: string;
};

type CountTarget = {
  Web: number;
  iOS: number;
  Android: number;
};

type CountEmpry = {
  target: number;
  engineer: number;
};

type BaseUriOption = {
  apiKey: string;
  count: number;
  "projectId[]": string;
  "issueTypeId[]": string;
};

type UriOption = { [key: string]: string | number };

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

class Counter {
  constructor(date: { begin: string; end: string }) {
    this.begin_date = date.begin;
    this.end_date = date.end;
  }

  protected begin_date: string = "";
  protected end_date: string = "";

  protected SPACE_ID = process.env.SPACE_ID || "";
  protected API_KEY = process.env.API_KEY || "";
  protected PROJECT_ID = process.env.PROJECT_ID || ""; // プロジェクト『バグ管理(BUGS)』
  protected SYSTEM_TROUBLE_ID = process.env.SYSTEM_TROUBLE_ID || ""; // 種別『システムトラブル 』
  protected COUNT = 100;

  protected base_option: BaseUriOption = {
    apiKey: this.API_KEY,
    count: this.COUNT,
    "projectId[]": this.PROJECT_ID,
    "issueTypeId[]": this.SYSTEM_TROUBLE_ID,
  };

  private OFFSHORE_FIN_DATE_ID: string = process.env.OFFSHORE_FIN_DATE_ID || "";
  private ENGINEER_FIN_DATE_ID: string = process.env.ENGINEER_FIN_DATE_ID || "";
  private TARGET_ID: string = process.env.TARGET_ID || "";
  private ENGINEER_ID: string = process.env.ENGINEER_ID || "";

  // カスタム属性名
  protected CUSTOM_FIELDS = {
    OFFSHORE_FIN_DATE: {
      //オフショア修正完了日
      ID: parseInt(this.OFFSHORE_FIN_DATE_ID),
      NAME: "オフショア修正完了日",
    },
    ENGINEER_FIN_DATE: {
      //エンジニア対応完了日
      ID: parseInt(this.ENGINEER_FIN_DATE_ID),
      NAME: "エンジニア対応完了日",
    },
    TARGET: {
      //ターゲット
      ID: parseInt(this.TARGET_ID),
      NAME: "ターゲット",
    },
    ENGINEER: {
      //エンジニア
      ID: parseInt(this.ENGINEER_ID),
      NAME: "エンジニア",
    },
  };

  // ターゲット value
  protected TARGET = {
    WEB: "Web",
    IOS: "iOS",
    ANDROID: "Android",
  };

  protected COMMON_CONSTANTS = {
    EMPTY: "未設定",
    OFFSHORE_EMPTY: "オフショアCRE（対応前 offshore）",
  };

  protected makeApiURI(params: UriOption): string {
    let query_string = "";
    for (const param in params) {
      const joint = query_string ? "&" : "";
      query_string +=
        joint +
        encodeURIComponent(param) +
        "=" +
        encodeURIComponent(params[param]);
    }

    return `https://${this.SPACE_ID}.backlog.com/api/v2/issues?${query_string}`;
  }

  protected async getJson(api: string) {
    return await fetch(api).then((res) => res.json());
  }
}

class EngineerFixed extends Counter {
  private jp_count_obj: CountTarget = {
    Web: 0,
    iOS: 0,
    Android: 0,
  };
  private offshore_count_obj: CountTarget = {
    Web: 0,
    iOS: 0,
    Android: 0,
  };
  private jp_total_count: number = 0;
  private offshore_total_count: number = 0;
  private empty_count: CountEmpry = {
    target: 0,
    engineer: 0,
  };

  private additional_option = {
    [`customField_${this.CUSTOM_FIELDS.ENGINEER_FIN_DATE.ID}_min`]:
      this.begin_date,
    [`customField_${this.CUSTOM_FIELDS.ENGINEER_FIN_DATE.ID}_max`]:
      this.end_date,
  };
  private uri_option: UriOption = {
    ...this.base_option,
    ...this.additional_option,
  };

  public async start() {
    const api = await this.makeApiURI(this.uri_option);
    const json = await this.getJson(api);
    const mold_tickets = await this.mold(json);
    await this.count(mold_tickets);
    await this.output();
  }

  private mold(all_tickets: any) {
    let tickets = [];
    let target;
    let engineer;

    for (let item of all_tickets) {
      for (let customField of item.customFields) {
        if (customField.id === this.CUSTOM_FIELDS.TARGET.ID) {
          // ターゲット
          target = customField.value
            ? customField.value.name
            : this.COMMON_CONSTANTS.EMPTY;
        } else if (customField.id === this.CUSTOM_FIELDS.ENGINEER.ID) {
          // エンジニア
          engineer = customField.value
            ? customField.value.name
            : this.COMMON_CONSTANTS.EMPTY;
        }
      }
      tickets.push({ target: target, engineer: engineer });
    }
    return tickets;
  }

  private count(tickets: Tickets[]) {
    const targets = ["Web", "iOS", "Android"] as const;
    const customFields = ["target", "engineer"] as const;

    for (const target of targets) {
      this.jp_count_obj[target] = tickets.filter((n: Tickets): boolean => {
        if (n.target === target && n.engineer && !n.engineer.includes("CRE")) {
          return true;
        }
        return false;
      }).length;
    }

    for (const target of targets) {
      this.offshore_count_obj[target] = tickets.filter(
        (n: Tickets): boolean => {
          if (n.target === target && n.engineer && n.engineer.includes("CRE")) {
            return true;
          }
          return false;
        }
      ).length;
    }

    this.jp_total_count = Object.values(this.jp_count_obj).reduce(
      (accumulator: number, current: number) => accumulator + current
    );

    this.offshore_total_count = Object.values(this.offshore_count_obj).reduce(
      (accumulator: number, current: number) => accumulator + current
    );

    for (const cf of customFields) {
      this.empty_count[cf] = tickets.filter((n: Tickets): boolean => {
        if (n.target === this.COMMON_CONSTANTS.EMPTY) {
          return true;
        }
        return false;
      }).length;
    }
  }

  private output() {
    const output = {
      total: this.jp_total_count + this.offshore_total_count,
      japan: {
        日本合計: this.jp_total_count,
        [this.TARGET.WEB]: this.jp_count_obj.Web,
        [this.TARGET.IOS]: this.jp_count_obj.iOS,
        [this.TARGET.ANDROID]: this.jp_count_obj.Android,
      },
      offshore: {
        オフショア合計: this.offshore_total_count,
        [this.TARGET.WEB]: this.offshore_count_obj.Web,
        [this.TARGET.IOS]: this.offshore_count_obj.iOS,
        [this.TARGET.ANDROID]: this.offshore_count_obj.Android,
      },
      empty: {
        target: this.empty_count.target,
        engineer: this.empty_count.engineer,
      },
    };
    console.log(
      `「「「「 ${this.CUSTOM_FIELDS.ENGINEER_FIN_DATE.NAME}（集計期間：　${this.begin_date}　〜　${this.end_date}） 」」」」`
    );
    console.log(output);

    if (output.empty.target || output.empty.engineer) {
      console.error(
        `『${this.CUSTOM_FIELDS.ENGINEER_FIN_DATE.NAME}』に未設定があります。ターゲット：${this.empty_count.target}件、エンジニア${this.empty_count.engineer}件`
      );
    }
  }
}

class OffshoreFixed extends Counter {
  private offshore_count: CountTarget = {
    Web: 0,
    iOS: 0,
    Android: 0,
  };
  private total_count: number = 0;
  private engineer_empty_count: number = 0;

  private additional_option = {
    [`customField_${this.CUSTOM_FIELDS.OFFSHORE_FIN_DATE.ID}_min`]:
      this.begin_date,
    [`customField_${this.CUSTOM_FIELDS.OFFSHORE_FIN_DATE.ID}_max`]:
      this.end_date,
  };
  private uri_option = { ...this.base_option, ...this.additional_option };

  public async start() {
    const api = await this.makeApiURI(this.uri_option);
    const json = await this.getJson(api);
    const mold_tickets = await this.mold(json);
    await this.count(mold_tickets);
    await this.output();
  }

  private mold(all_tickets: any) {
    let tickets = [];
    let target;

    for (let item of all_tickets) {
      for (let customField of item.customFields) {
        if (customField.id === this.CUSTOM_FIELDS.TARGET.ID) {
          // ターゲット
          target = customField.value
            ? customField.value.name
            : this.COMMON_CONSTANTS.EMPTY;

          tickets.push({ target: target });
        }
      }
    }
    return tickets;
  }

  private count(tickets: Tickets[]) {
    const targets = ["Web", "iOS", "Android"] as const;

    for (const target of targets) {
      this.offshore_count[target] = tickets.filter((n) => {
        if (n.target === target) {
          return true;
        }
        return false;
      }).length;
    }

    this.total_count = Object.values(this.offshore_count).reduce(
      (accumulator: number, current: number) => accumulator + current
    );

    this.engineer_empty_count = tickets.filter((n) => {
      if (n.engineer === this.COMMON_CONSTANTS.OFFSHORE_EMPTY) {
        return true;
      }
      return false;
    }).length;
  }

  private output() {
    const output = {
      合計: this.total_count,
      [this.TARGET.WEB]: this.offshore_count.Web,
      [this.TARGET.IOS]: this.offshore_count.iOS,
      [this.TARGET.ANDROID]: this.offshore_count.Android,
      engineer_empry: this.engineer_empty_count,
    };
    console.log(
      `「「「「 ${this.CUSTOM_FIELDS.OFFSHORE_FIN_DATE.NAME} （集計期間：　${this.begin_date}　〜　${this.end_date} ）」」」」`
    );
    console.log(output);

    if (output.engineer_empry) {
      console.error(
        `『${this.CUSTOM_FIELDS.OFFSHORE_FIN_DATE.NAME}』に未設定があります。エンジニア${this.engineer_empty_count}件`
      );
    }
  }
}

(async () => {
  new BugCounter({
    begin: process.argv[2],
    end: process.argv[3],
  }).start();
})();
