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
// type TargetKey = typeof targets[number];
type TargetObj = { [key in "Web" | "iOS" | "Android"]: number };
type TargetKey = keyof Target;
// type CounterStore = {
//   [key in CounterType]: Counter;
// };

const counterTypes = ["enginnerFixed", "offshoreFixed"] as const;
type CounterType = typeof counterTypes[number];

class BugCounter {
  private SPACE_ID = process.env.SPACE_ID;
  private API_KEY = process.env.API_KEY;
  private PROJECT_ID = process.env.PROJECT_ID; // プロジェクト『バグ管理(BUGS)』
  private SYSTEM_TROUBLE_ID = process.env.SYSTEM_TROUBLE_ID; // 種別『システムトラブル 』
  private COUNT = 100;

  // constructor(private readonly gameStore: CounterStore) {}

  // カスタム属性名
  private CUSTOM_FIELDS = {
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
  };

  // ターゲット value
  private TARGET = {
    WEB: "Web",
    IOS: "iOS",
    ANDROID: "Android",
  };

  private COMMON_VALUES = {
    EMPTY: "未設定",
    OFFSHORE_EMPTY: "オフショア（対応前 offshore）",
  };

  // =====================================================================================
  // 基準日付を設定して実行
  private START_DATE = "2022-01-01";
  // =====================================================================================

  public start() {
    this.getEngineerFixCompletedCount();
  }

  async getEngineerFixCompletedCount() {
    const url_option = {
      apiKey: this.API_KEY,
      count: this.COUNT,
      [`customField_${this.CUSTOM_FIELDS.ENGINEER_FIN_DATE.ID}_min`]:
        this.START_DATE,
      "projectId[]": this.PROJECT_ID,
      "issueTypeId[]": this.SYSTEM_TROUBLE_ID,
    };
    const option_params = this.makeQueryString(url_option);

    const api =
      `https://${this.SPACE_ID}.backlog.com/api/v2/issues` + option_params;
    console.log(api);

    const json = await this.getJson(api);
    const mold_tickets = await this.mold(json);
    await this.count(mold_tickets);
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
        if (customField.id === 38686.0) {
          // ターゲット
          target = customField.value ? customField.value.name : "未設定";
        } else if (customField.id === 95175.0) {
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

    const jp_total_count = Object.values(this.jp_count_obj).reduce(
      (accumulator: number, current: number) => accumulator + current
    );

    const web_offshore_count = tickets.filter((n: Tickets): boolean => {
      if (n.target === this.TARGET.WEB && n.engineer.includes("CRE")) {
        return true;
      }
      return false;
    }).length;
    const ios_offshore_count = tickets.filter((n: Tickets): boolean => {
      if (n.target === this.TARGET.IOS && n.engineer.includes("CRE")) {
        return true;
      }
      return false;
    }).length;
    const android_offshore_count = tickets.filter((n: Tickets): boolean => {
      if (n.target === this.TARGET.ANDROID && n.engineer.includes("CRE")) {
        return true;
      }
      return false;
    }).length;

    const offshore_total_count =
      web_offshore_count + ios_offshore_count + android_offshore_count;

    const target_empty_count = tickets.filter((n: Tickets): boolean => {
      if (n.target === "未設定") {
        return true;
      }
      return false;
    }).length;
    const engineer_empty_count = tickets.filter((n: Tickets): boolean => {
      if (n.engineer === "未設定") {
        return true;
      }
      return false;
    }).length;

    const output = {
      total: jp_total_count + offshore_total_count,
      japan: {
        日本合計: jp_total_count,
        [this.TARGET.WEB]: this.jp_count_obj.Web,
        [this.TARGET.IOS]: this.jp_count_obj.iOS,
        [this.TARGET.ANDROID]: this.jp_count_obj.Android,
      },
      offshore: {
        オフショア合計: offshore_total_count,
        [this.TARGET.WEB]: this.offshore_count_obj.Web,
        [this.TARGET.IOS]: this.offshore_count_obj.iOS,
        [this.TARGET.ANDROID]: this.offshore_count_obj.Android,
      },
      empty: {
        target: target_empty_count,
        engineer: engineer_empty_count,
      },
    };
    console.log(
      `「「「「 ${this.CUSTOM_FIELDS.ENGINEER_FIN_DATE.NAME}（${this.START_DATE} 以降） 」」」」`
    );
    console.log(output);

    if (output.empty.target || output.empty.engineer) {
      console.error(
        `『${this.CUSTOM_FIELDS.ENGINEER_FIN_DATE.NAME}』に未設定があります。ターゲット：${target_empty_count}件、エンジニア${engineer_empty_count}件`
      );
    }
  }

  private makeQueryString(param: any) {
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
