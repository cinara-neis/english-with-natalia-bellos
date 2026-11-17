export const btsPhotos = {
  together: {
    src: "images/bts/together.jpg",
    title: "BTS together",
    alt: "BTS at the White House in Washington, D.C., in May 2022.",
    credit: "Misha Komadovsky / Voice of America",
    source: "https://commons.wikimedia.org/wiki/File:Here_we_go!_-BTS_-BTSatTheWhiteHouse.jpg",
    licence: "Public domain",
    licenceUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
  },
  carpet: {
    src: "images/bts/red-carpet.jpg",
    title: "BTS on the red carpet",
    alt: "BTS together on the Golden Disc Awards red carpet in January 2019.",
    credit: "Newsen",
    source: "https://commons.wikimedia.org/wiki/File:BTS_on_the_33rd_Golden_Disc_Awards_red_carpet,_5_January_2019_01.jpg",
    licence: "CC BY 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by/3.0/",
  },
  stage: {
    src: "images/bts/on-stage.jpg",
    title: "BTS on stage",
    alt: "BTS during the Permission to Dance on Stage concert in November 2021.",
    credit: "Toda",
    source: "https://commons.wikimedia.org/wiki/File:BTSPTDonStageDay2.jpg",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
} as const;

export type BtsPhoto = typeof btsPhotos[keyof typeof btsPhotos];

export const btsSongs = [
  { id: "gdZLi9oWNZg", title: "Dynamite", prompt: "Listen for three English words you know. Use one in your own sentence." },
  { id: "WMweEpGlu_U", title: "Butter", prompt: "Describe the music video in English. What can you see?" },
  { id: "CuklIb9d3fI", title: "Permission to Dance", prompt: "How does the song make you feel? Tell your teacher in English." },
] as const;
