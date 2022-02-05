import fetch from "node-fetch";

const SPACE_ID = "p10n";
const API_KEY =
  "Rb80JH5OOJj5bPNNUre6dH8EP2MpTxvXLEzSJGW14GSJ2f2dtv4CxdtHs5HBKdYN";

const PROJECT_ID = 89385; // プロジェクト『バグ管理(BUGS)』
const SYSTEM_TROUBLE_ID = 424334; // 種別『システムトラブル 』

const COUNT = 100;

// カスタム属性名
const CUSTOM_FIELDS = {
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
const TARGET = {
  WEB: "Web",
  IOS: "iOS",
  ANDROID: "Android",
};

const COMMON_VALUES = {
  EMPTY: "未設定",
  OFFSHORE_EMPTY: "オフショア（対応前 offshore）",
};

// =====================================================================================
// 基準日付を設定して実行
const START_DATE = "2022-01-01";
// =====================================================================================

function getEngineerFixCompletedCount() {
  const url_option = {
    apiKey: API_KEY,
    count: COUNT,
    [`customField_${CUSTOM_FIELDS.ENGINEER_FIN_DATE.ID}_min`]: START_DATE,
    "projectId[]": PROJECT_ID,
    "issueTypeId[]": SYSTEM_TROUBLE_ID,
  };
  const option_params = makeQueryString(url_option);

  const api = `https://${SPACE_ID}.backlog.com/api/v2/issues` + option_params;
  console.log(api);

  getJson(api);
}

async function getJson(api: string) {
  const json = await fetch(api).then((res) => res.json());
  const mold_tickets = mold(json);
  count(mold_tickets);
}

function mold(all_tickets: any) {
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

type Tickets = {
  target: string;
  engineer: string;
};

type Target = "Web" | "iOS" | "Android";

function count(tickets: Tickets[]) {
  const web_jp_count = tickets.filter((n: Tickets): boolean => {
    if (n.target === TARGET.WEB && !n.engineer.includes("CRE")) {
      return true;
    }
    return false;
  }).length;

  const ios_jp_count = tickets.filter(
    (n: { target: any; engineer: any }): boolean => {
      if (n.target === TARGET.IOS && !n.engineer.includes("CRE")) {
        return true;
      }
      return false;
    }
  ).length;
  const android_jp_count = tickets.filter(
    (n: { target: any; engineer: any }): boolean => {
      if (n.target === TARGET.ANDROID && !n.engineer.includes("CRE")) {
        return true;
      }
      return false;
    }
  ).length;

  const jp_total_count = web_jp_count + ios_jp_count + android_jp_count;

  const web_offshore_count = tickets.filter(
    (n: { target: any; engineer: any }): boolean => {
      if (n.target === TARGET.WEB && n.engineer.includes("CRE")) {
        return true;
      }
      return false;
    }
  ).length;
  const ios_offshore_count = tickets.filter(
    (n: { target: any; engineer: any }): boolean => {
      if (n.target === TARGET.IOS && n.engineer.includes("CRE")) {
        return true;
      }
      return false;
    }
  ).length;
  const android_offshore_count = tickets.filter(
    (n: { target: any; engineer: any }): boolean => {
      if (n.target === TARGET.ANDROID && n.engineer.includes("CRE")) {
        return true;
      }
      return false;
    }
  ).length;

  const offshore_total_count =
    web_offshore_count + ios_offshore_count + android_offshore_count;

  const target_empty_count = tickets.filter(
    (n: { target: any; engineer: any }): boolean => {
      if (n.target === "未設定") {
        return true;
      }
      return false;
    }
  ).length;
  const engineer_empty_count = tickets.filter(
    (n: { target: any; engineer: any }): boolean => {
      if (n.engineer === "未設定") {
        return true;
      }
      return false;
    }
  ).length;

  const output = {
    total: jp_total_count + offshore_total_count,
    japan: {
      日本合計: jp_total_count,
      [TARGET.WEB]: web_jp_count,
      [TARGET.IOS]: ios_jp_count,
      [TARGET.ANDROID]: android_jp_count,
    },
    offshore: {
      オフショア合計: offshore_total_count,
      [TARGET.WEB]: web_offshore_count,
      [TARGET.IOS]: ios_offshore_count,
      [TARGET.ANDROID]: android_offshore_count,
    },
    empty: {
      target: target_empty_count,
      engineer: engineer_empty_count,
    },
  };
  console.log(
    `「「「「 ${CUSTOM_FIELDS.ENGINEER_FIN_DATE.NAME}（${START_DATE} 以降） 」」」」`
  );
  console.log(output);

  if (output.empty.target || output.empty.engineer) {
    console.error(
      `『${CUSTOM_FIELDS.ENGINEER_FIN_DATE.NAME}』に未設定があります。ターゲット：${target_empty_count}件、エンジニア${engineer_empty_count}件`
    );
  }
}

function makeQueryString(param: any) {
  //TODO anyをしゅうせい
  let query_string = "";
  for (const p in param) {
    let joint = query_string ? "&" : "";
    query_string +=
      joint + encodeURIComponent(p) + "=" + encodeURIComponent(param[p]);
  }

  return "?" + query_string;
}

getEngineerFixCompletedCount();
