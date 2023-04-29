export type TwitchIds =
  | false
  | {
      moderator_id: string | false;
      broadcaster_id: string | false;
    };

export type ApiTwitchIds = {
  data: {
    data: {
      id: string;
      login: string;
      type: string;
      broadcaster_type: string;
      description: string;
      profile_image_url: string;
      offline_image_url: string;
      view_count: number;
      created_at: string;
    }[];
  };
};

export type ApiViewersIds = {
  data: {
    data: {
      user_id: string;
      user_login: string;
      user_name: string;
    }[];
    pagination: {
      cursor?: string;
    };
    total: number;
  };
};

export type ApiTwitchStatus = {
  data: {
    data: {
      id: string;
      user_id: string;
      user_login: string;
      user_name: string;
      game_id: string;
      game_name: string;
      type: string;
      title: string;
      viewer_count: number;
      started_at: string;
      language: string;
      thumbnail_url: string;
      tag_ids: string[];
      tags: string[];
      is_mature: boolean;
    }[];
    pagination: {
      cursor?: string;
    };
  };
};
