import React , { createContext , useContext , useState , useEffect , useCallback} from "react";
const baseUrl = import.meta.env.VITE_API_BASE_URL as string;

interface AuthContextType {
    isAuthenticated: boolean;
    login: (pin: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}; 

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    const login = useCallback(async (password: string): Promise<boolean> => {
        try {
            const response = await fetch(`${baseUrl}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
            if (response.ok) {
                setIsAuthenticated(true);
                localStorage.setItem("isAuthenticated", "true");
                return true;
            } else {
                setIsAuthenticated(false);
                localStorage.removeItem("isAuthenticated");
                return false;
            }
        } catch {
            setIsAuthenticated(false);
            localStorage.removeItem("isAuthenticated");
            return false;
        }
    }, []);

    const logout = useCallback(() => {
        setIsAuthenticated(false);
        localStorage.removeItem("isAuthenticated");
    }, []);

    useEffect(() => {
        const storedAuth = localStorage.getItem("isAuthenticated");
        if (storedAuth === "true") {
            setIsAuthenticated(true);
        }
    }, []);

    const value = {
        isAuthenticated,
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
