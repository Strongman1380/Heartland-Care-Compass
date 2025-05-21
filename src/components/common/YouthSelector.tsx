
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "@/pages/Index";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Youth {
  id: string;
  firstName: string;
  lastName: string;
  level: number;
  pointTotal: number;
  age: number;
  imageUrl?: string;
}

interface YouthSelectorProps {
  onSelectYouth: (youthId: string) => void;
}

export const YouthSelector = ({ onSelectYouth }: YouthSelectorProps) => {
  const [youths, setYouths] = useState<Youth[]>([]);
  const [filteredYouths, setFilteredYouths] = useState<Youth[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchYouths = async () => {
      try {
        const youthsCollection = collection(firestore, "youths");
        const snapshot = await getDocs(youthsCollection);
        const youthsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Youth, "id">),
        }));
        
        setYouths(youthsData);
        setFilteredYouths(youthsData);
      } catch (error) {
        console.error("Error fetching youths:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchYouths();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = youths.filter((youth) =>
        `${youth.firstName} ${youth.lastName}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
      setFilteredYouths(filtered);
    } else {
      setFilteredYouths(youths);
    }
  }, [searchTerm, youths]);

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return "bg-red-100 text-red-800";
      case 2: return "bg-yellow-100 text-yellow-800";
      case 3: return "bg-blue-100 text-blue-800";
      case 4: return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading youth profiles...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Active Youth</h2>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="text"
            placeholder="Search by name"
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredYouths.length > 0 ? (
          filteredYouths.map((youth) => (
            <div
              key={youth.id}
              className="border rounded-md p-4 hover:shadow-md transition-shadow cursor-pointer flex items-center space-x-3"
              onClick={() => onSelectYouth(youth.id)}
            >
              <Avatar>
                {youth.imageUrl ? (
                  <img src={youth.imageUrl} alt={`${youth.firstName} ${youth.lastName}`} />
                ) : (
                  <div className="bg-blue-200 h-full w-full flex items-center justify-center">
                    <span className="text-blue-700 font-medium">
                      {youth.firstName[0]}
                      {youth.lastName[0]}
                    </span>
                  </div>
                )}
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{youth.firstName} {youth.lastName}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-gray-500">Age: {youth.age}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getLevelColor(youth.level)}`}>
                    Level {youth.level}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-gray-500">
            {youths.length === 0 ? "No youth profiles found. Add a youth to get started." : "No matching results found."}
          </div>
        )}
      </div>
    </div>
  );
};
