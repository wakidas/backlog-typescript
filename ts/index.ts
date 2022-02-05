import "dotenv/config";
console.log(process.env.API_KEY);

import fetch from "node-fetch";

type Tickets = {
  target: string;
  engineer: string;
};

interface Target {
  Web: string;
  iOS: string;
  Android: string;
}

const targets = ["Web", "iOS", "Android"] as const;
type TargetObj = { [key in "Web" | "iOS" | "Android"]: number };

class BugCounter {
  public start() {
    new EngineerFixed().start();
  }
}

class Counter {
  protected SPACE_ID = process.env.SPACE_ID;
  protected API_KEY = process.env.API_KEY;
  protected PROJECT_ID = process.env.PROJECT_ID; // プロジェクト『バグ管理(BUGS)』
  protected SYSTEM_TROUBLE_ID = process.env.SYSTEM_TROUBLE_ID; // 種別『システムトラブル 』
  protected COUNT = 100;

  // カスタム属性名
  protected CUSTOM_FIELDS = {
    OFFSHORE_FIN_DATE: {
      //オフショア修正完了日
      ID: 120512,
      NAME: "オフショア修正完了日",
    },
    ENGINEER_FIN_DATE: {
      //エンジニア対応完了日
      ID: 105982,
      NAME: "エンジニア対応完了日",
    },
    TARGET: {
      //ターゲット
      ID: 38686,
      NAME: "ターゲット",
    },
    ENGINEER: {
      //エンジニア
      ID: 95175,
      NAME: "エンジニア",
    },
  };

  // ターゲット value
  protected TARGET = {
    WEB: "Web",
    IOS: "iOS",
    ANDROID: "Android",
  };

  protected COMMON_VALUES = {
    EMPTY: "未設定",
    OFFSHORE_EMPTY: "オフショア（対応前 offshore）",
  };
  // =====================================================================================
  // 基準日付を設定して実行
  protected START_DATE = "2022-01-01";
  // =====================================================================================

  protected makeQueryString(param: any) {
    //TODO anyをしゅうせい
    let query_string = "";
    for (const p in param) {
      let joint = query_string ? "&" : "";
      query_string +=
        joint + encodeURIComponent(p) + "=" + encodeURIComponent(param[p]);
    }

    return "?" + query_string;
  }
}

class EngineerFixed extends Counter {
  private base_option = {
    apiKey: this.API_KEY,
    count: this.COUNT,
    "projectId[]": this.PROJECT_ID,
    "issueTypeId[]": this.SYSTEM_TROUBLE_ID,
  };

  private additional_option = {
    [`customField_${this.CUSTOM_FIELDS.ENGINEER_FIN_DATE.ID}_min`]:
      this.START_DATE,
  };

  private url_option = { ...this.base_option, ...this.additional_option };

  private option_params = this.makeQueryString(this.url_option);

  private api =
    `https://${this.SPACE_ID}.backlog.com/api/v2/issues` + this.option_params;

  public async start() {
    const json = await this.getJson(this.api);
    const mold_tickets = await this.mold(json);
    await this.count(mold_tickets);
    await this.output();
  }

  async getJson(api: string) {
    return await fetch(api).then((res) => res.json());
  }

  mold(all_tickets: any) {
    let tickets = [];
    let target;
    let engineer;

    for (let item of all_tickets) {
      for (let customField of item.customFields) {
        if (customField.id === this.CUSTOM_FIELDS.TARGET.ID) {
          // ターゲット
          target = customField.value ? customField.value.name : "未設定";
        } else if (customField.id === this.CUSTOM_FIELDS.ENGINEER.ID) {
          // エンジニア
          engineer = customField.value ? customField.value.name : "未設定";
        }
      }
      tickets.push({ target: target, engineer: engineer });
    }
    return tickets;
  }

  private jp_count_obj: TargetObj = {
    Web: 0,
    iOS: 0,
    Android: 0,
  };
  private offshore_count_obj: { [key in "Web" | "iOS" | "Android"]: number } = {
    Web: 0,
    iOS: 0,
    Android: 0,
  };
  private jp_total_count: number = 0;
  private offshore_total_count: number = 0;
  private target_empty_count: number = 0;
  private engineer_empty_count: number = 0;

  count(tickets: Tickets[]) {
    for (const target of targets) {
      this.jp_count_obj[target] = tickets.filter((n: Tickets): boolean => {
        if (n.target === target && !n.engineer.includes("CRE")) {
          return true;
        }
        return false;
      }).length;
    }

    for (const target of targets) {
      this.offshore_count_obj[target] = tickets.filter(
        (n: Tickets): boolean => {
          if (n.target === target && n.engineer.includes("CRE")) {
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

    this.target_empty_count = tickets.filter((n: Tickets): boolean => {
      if (n.target === "未設定") {
        return true;
      }
      return false;
    }).length;
    this.engineer_empty_count = tickets.filter((n: Tickets): boolean => {
      if (n.engineer === "未設定") {
        return true;
      }
      return false;
    }).length;
  }

  output() {
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
        target: this.target_empty_count,
        engineer: this.engineer_empty_count,
      },
    };
    console.log(
      `「「「「 ${this.CUSTOM_FIELDS.ENGINEER_FIN_DATE.NAME}（${this.START_DATE} 以降） 」」」」`
    );
    console.log(output);

    if (output.empty.target || output.empty.engineer) {
      console.error(
        `『${this.CUSTOM_FIELDS.ENGINEER_FIN_DATE.NAME}』に未設定があります。ターゲット：${this.target_empty_count}件、エンジニア${this.engineer_empty_count}件`
      );
    }
  }
}
// abstract class Counter {
//   abstract setting(): Promise<void>;
//   abstract mold(): Promise<void>;
//   abstract count(): Promise<void>;
//   abstract output(): Promise<void>;
// }

// class EngineerFixed {
//   //
// }
// class OffshoreFixed {
//   //
// }

(async () => {
  new BugCounter().start();
  // {
  // enginnerFixed: new EngineerFixed(),
  // offshoreFixed: new OffshoreFixed(),
  // }
})();
