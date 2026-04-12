import { useAuth } from "@workos-inc/authkit-react";
import { useEffect, useEffectEvent } from "react";

type UserOrNull = ReturnType<typeof useAuth>["user"];

export const useUser = (): UserOrNull => {
	const { user, isLoading, signIn } = useAuth();
	const location = useEffectEvent(() => window.location);

	useEffect(() => {
		if (!isLoading && !user) {
			signIn({
				state: { returnTo: location().pathname },
			});
		}
	}, [isLoading, user, signIn]);

	return user;
};
